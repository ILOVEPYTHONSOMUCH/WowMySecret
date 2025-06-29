const Quiz = require('../models/Quiz');

exports.createQuiz = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    // แปลง questions จาก JSON string หรือรับเป็น array เลย
    let questions = [];
    if (req.body.questions) {
      questions = typeof req.body.questions === 'string'
        ? JSON.parse(req.body.questions)
        : req.body.questions;
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required' });
    }

    // แมปแต่ละข้อ เติม imageUrl, ตรวจครบทุกฟิลด์
    questions = questions.map((q, idx) => {
      const fileField = `questionImage_${idx}`;
      const fileArr = req.files?.[fileField];
      const imageUrl = fileArr && fileArr[0]
        ? fileArr[0].path
        : q.imageUrl || null;

      if (!q.text || typeof q.answerKey !== 'number') {
        throw { status: 400, message: `Question ${idx} missing text or answerKey` };
      }
      if (!Array.isArray(q.options) || q.options.length !== 5) {
        throw { status: 400, message: `Question ${idx} must have 5 options` };
      }

      return {
        text:      q.text,
        imageUrl,
        options:   q.options,
        answerKey: q.answerKey
      };
    });

    // สร้าง quiz ใหม่ใน DB
    const quiz = new Quiz({
      title,
      owner:    req.user._id,
      questions // totalScore auto-calc via pre-save hook
    });
    await quiz.save();

    res.json({ id: quiz._id });
  } catch (err) {
    console.error(err);
    const status  = err.status || 500;
    const message = err.message || 'Server error';
    return res.status(status).json({ error: message });
  }
};

exports.listQuizzes = async (req, res) => {
  const quizzes = await Quiz.find()
    .select('title owner takerCount totalScore createdAt')
    .populate('owner', 'name');
  res.json(quizzes);
};

exports.getQuizDetail = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).populate('owner', 'name');
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  // ไม่รวมเฉลย
  const questions = quiz.questions.map(q => ({
    text:     q.text,
    imageUrl: q.imageUrl,
    options:  q.options
  }));

  res.json({
    id:         quiz._id,
    title:      quiz.title,
    owner:      quiz.owner,
    questions,
    totalScore: quiz.totalScore,
    takerCount: quiz.takerCount
  });
};

exports.answerQuiz = async (req, res) => {
  const { answers } = req.body; // [{ questionIndex, answer }]
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  let score = 0;
  answers.forEach(({ questionIndex, answer }) => {
    if (quiz.questions[questionIndex].answerKey === answer) {
      score++;
    }
  });

  quiz.takerCount++;
  await quiz.save();

  res.json({ score, totalScore: quiz.totalScore });
};

exports.getQuizAnswers = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  if (!quiz.owner.equals(req.user._id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const answers = quiz.questions.map((q, idx) => ({
    questionIndex: idx,
    answerKey:     q.answerKey,
    text:          q.text,
    imageUrl:      q.imageUrl,
    options:       q.options
  }));

  res.json({
    id:         quiz._id,
    title:      quiz.title,
    owner:      req.user._id,
    totalScore: quiz.totalScore,
    takerCount: quiz.takerCount,
    answers
  });
};
