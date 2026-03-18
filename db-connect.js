/**
 * db-connect.js — Gnoke School Management System
 * Bridges:
 *   students.db  →  StudentRegisterStorage / db_blobs
 *   teachers.db  →  subteach_app           / database
 *   scores.db    →  sch_scores             / database
 *
 * All databases use SQL.js (SQLite WASM).
 *
 * Usage:
 *   const conn = await DbConnect.init(SQL);
 *   const students = conn.getStudentsByClass('JSS3A');
 *   const teacher  = conn.verifyTeacher(username, password);
 *   const scores   = conn.getScores('JSS3A', 'Mathematics', 'FIRST', '2024/2025');
 *   await conn.saveScore({ ... });
 */

const DbConnect = (() => {

  const CFG = {
    students: { idb: 'StudentRegisterStorage', store: 'db_blobs', key: 'db' },
    teachers: { idb: 'subteach_app',           store: 'database', key: 'db' },
    scores:   { idb: 'sch_scores',             store: 'database', key: 'db' },
  };

  let SQL = null;
  let dbs = { students: null, teachers: null, scores: null };

  /* ── Generic IDB helpers ── */
  function idbOpen(cfg) {
    return new Promise((res, rej) => {
      const req = indexedDB.open(cfg.idb, 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore(cfg.store);
      req.onsuccess = e => res(e.target.result);
      req.onerror   = e => rej(e.target.error);
    });
  }

  async function idbGet(cfg) {
    const idb = await idbOpen(cfg);
    return new Promise((res, rej) => {
      const req = idb.transaction(cfg.store, 'readonly')
                     .objectStore(cfg.store).get(cfg.key);
      req.onsuccess = () => res(req.result || null);
      req.onerror   = () => rej(req.error);
    });
  }

  async function idbSet(cfg, val) {
    const idb = await idbOpen(cfg);
    return new Promise((res, rej) => {
      const req = idb.transaction(cfg.store, 'readwrite')
                     .objectStore(cfg.store).put(val, cfg.key);
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  }

  /* ── Load a SQL.js db from IDB ── */
  async function loadDb(name) {
    const blob = await idbGet(CFG[name]);
    if (blob) return new SQL.Database(new Uint8Array(blob));
    return null;
  }

  /* ── Persist scores db back to IDB ── */
  async function saveScoresDb() {
    if (!dbs.scores) return;
    await idbSet(CFG.scores, dbs.scores.export());
  }

  /* ── Init scores schema if new ── */
  function initScoresDb() {
    dbs.scores = new SQL.Database();
    dbs.scores.run(`
      CREATE TABLE IF NOT EXISTS scores (
        id               TEXT PRIMARY KEY,
        student_id       TEXT NOT NULL,
        student_name     TEXT NOT NULL,
        class_level      TEXT NOT NULL,
        subject          TEXT NOT NULL,
        teacher_username TEXT,
        term             TEXT NOT NULL,
        session          TEXT NOT NULL,
        cat1             REAL,
        cat2             REAL,
        assignment       REAL,
        note             REAL,
        cw               REAL,
        exams            REAL,
        total            REAL,
        grade            TEXT,
        updated_at       TEXT
      )
    `);
  }

  /* ── Public API ── */
  const api = {

    /** Initialise — call once after initSqlJs() resolves */
    async init(sqlInstance) {
      SQL = sqlInstance;
      dbs.students = await loadDb('students');
      dbs.teachers = await loadDb('teachers');

      const savedScores = await idbGet(CFG.scores);
      if (savedScores) {
        dbs.scores = new SQL.Database(new Uint8Array(savedScores));
      } else {
        initScoresDb();
        await saveScoresDb();
      }
      return api;
    },

    /** {id, name, sex}[] for a class table e.g. 'JSS3A' */
    getStudentsByClass(classLevel) {
      if (!dbs.students) return [];
      try {
        const res = dbs.students.exec(
          `SELECT id, name, sex FROM "${classLevel}" ORDER BY name`
        );
        if (!res.length) return [];
        return res[0].values.map(([id, name, sex]) => ({ id, name, sex }));
      } catch { return []; }
    },

    /** Returns teacher row object or null */
    verifyTeacher(username, password) {
      if (!dbs.teachers) return null;
      try {
        const res = dbs.teachers.exec(
          `SELECT id,role,subject,classes,name,username FROM teachers
           WHERE username=? AND password=?`,
          [username, password]
        );
        if (!res.length || !res[0].values.length) return null;
        const [id, role, subject, classes, name, uname] = res[0].values[0];
        return { id, role, subject, classes, name, username: uname };
      } catch { return null; }
    },

    /**
     * Expand class levels to sections.
     * 'JSS1,JSS3' → ['JSS1A','JSS1B','JSS1C','JSS1D','JSS3A',…]
     */
    expandClasses(classesField) {
      if (!classesField || classesField === 'N/A') return [];
      return classesField.split(',').flatMap(level =>
        ['A','B','C','D'].map(s => `${level.trim()}${s}`)
      );
    },

    /** Score rows for class/subject/term/session */
    getScores(classLevel, subject, term, session) {
      if (!dbs.scores) return [];
      try {
        const res = dbs.scores.exec(
          `SELECT * FROM scores
           WHERE class_level=? AND subject=? AND term=? AND session=?`,
          [classLevel, subject, term, session]
        );
        if (!res.length) return [];
        const cols = res[0].columns;
        return res[0].values.map(row =>
          Object.fromEntries(cols.map((c, i) => [c, row[i]]))
        );
      } catch { return []; }
    },

    /** Upsert a single score row */
    async saveScore(s) {
      if (!dbs.scores) return;
      const id = `${s.class_level}_${s.subject}_${s.term}_${s.session}_${s.student_id}`;
      dbs.scores.run(`
        INSERT INTO scores
          (id,student_id,student_name,class_level,subject,teacher_username,
           term,session,cat1,cat2,assignment,note,cw,exams,total,grade,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET
          cat1=excluded.cat1, cat2=excluded.cat2,
          assignment=excluded.assignment, note=excluded.note, cw=excluded.cw,
          exams=excluded.exams, total=excluded.total, grade=excluded.grade,
          updated_at=excluded.updated_at
      `, [id, s.student_id, s.student_name, s.class_level, s.subject,
          s.teacher_username || null, s.term, s.session,
          s.cat1, s.cat2, s.assignment, s.note, s.cw, s.exams,
          s.total, s.grade, new Date().toISOString()]);
      await saveScoresDb();
    },

    /** Batch save — for full-table writes */
    async saveAllScores(rows) {
      if (!dbs.scores) return;
      for (const s of rows) await api.saveScore(s);
    },

    /** Export scores.db as a downloadable file */
    exportScoresDb() {
      if (!dbs.scores) return;
      const data = dbs.scores.export();
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url  = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: 'scores.db' }).click();
      URL.revokeObjectURL(url);
    },

    get studentsDb() { return dbs.students; },
    get teachersDb() { return dbs.teachers; },
    get scoresDb()   { return dbs.scores;   },
  };

  return api;
})();
