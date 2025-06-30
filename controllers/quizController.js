const Quiz = require('../models/Quiz');

exports.createQuiz = async (req, res) => {
  try {
    const { title, subjectTag } = req.body;
    if (!title || !subjectTag) {
      return res.status(400).json({ error: 'Title and subjectTag are required' });
    }

    // แปลง questions
    let questionsRaw = req.body.questions;
    if (typeof questionsRaw === 'string') {
      questionsRaw = JSON.parse(questionsRaw);
    }
    if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
      return res.status(400).json({ error: 'Questions must be a non-empty array' });
    }

    // ตรวจ req.user
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ประกอบ questions และ image
    const questions = questionsRaw.map((q, idx) => {
      const file = req.files?.find(f => f.fieldname === `questionImage_${idx}`);
      const imageUrl = file?.path || q.imageUrl || null;

      if (!q.text) throw new Error(`Question ${idx} missing text`);
      if (!Array.isArray(q.options) || q.options.length !== 5) throw new Error(`Question ${idx} must have 5 options`);
      if (typeof q.answerKey !== 'number') throw new Error(`Question ${idx} missing answerKey`);

      return {
        text: q.text,
        imageUrl,
        options: q.options,
        answerKey: q.answerKey
      };
    });

    const quiz = new Quiz({
      title,
      subjectTag,
      owner: req.user._id,
      questions
    });
    await quiz.save();

    res.status(201).json({ id: quiz._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.listQuizzes = async (req, res) => {
  const quizzes = await Quiz.find()
    .select('title subjectTag owner questionCount takerCount totalScore createdAt')
    .populate('owner', 'name');
  res.json(quizzes);
};

exports.getQuizDetail = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).populate('owner', 'name');
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const questions = quiz.questions.map(q => ({
    text: q.text,
    imageUrl: q.imageUrl,
    options: q.options
  }));

  res.json({
    id: quiz._id,
    title: quiz.title,
    subjectTag: quiz.subjectTag,
    owner: quiz.owner,
    questionCount: quiz.questionCount,
    totalScore: quiz.totalScore,
    takerCount: quiz.takerCount,
    questions
  });
};

exports.answerQuiz = async (req, res) => {
  const { answers } = req.body;
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  let score = 0;
  answers.forEach(({ questionIndex, answer }) => {
    if (quiz.questions[questionIndex].answerKey === answer) score++;
  });

  quiz.takerCount++;
  await quiz.save();

  res.json({ score, totalScore: quiz.totalScore });
};

exports.getQuizAnswers = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  if (!quiz.owner.equals(req.user._id)) return res.status(403).json({ error: 'Forbidden' });

  const answers = quiz.questions.map((q, idx) => ({
    questionIndex: idx,
    text: q.text,
    imageUrl: q.imageUrl,
    options: q.options,
    answerKey: q.answerKey
  }));

  res.json({
    id: quiz._id,
    title: quiz.title,
    subjectTag: quiz.subjectTag,
    totalScore: quiz.totalScore,
    takerCount: quiz.takerCount,
    answers
  });
};