
import { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API = "http://127.0.0.1:8000";

const STATUS_META = {
  completed: { icon: "✓", label: "Completed", cls: "st-completed" },
  in_progress: { icon: "🔄", label: "In Progress", cls: "st-progress" },
  next: { icon: "⏳", label: "Next", cls: "st-next" },
  locked: { icon: "🔒", label: "Locked", cls: "st-locked" },
};

function App() {
  const [form, setForm] = useState({
    name: '',
    start_date: new Date().toISOString().split('T')[0],
    goal: 'Machine Learning Engineer',
    interests: 'AI, Machine Learning',
    current_skills: 'Python',
    completed_courses: '',
    experience_level: 'Beginner',
    hours_per_week: 10,
    feedback: ''

  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [xp, setXp] = useState(0)
  const [badges, setBadges] = useState([])
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizSkill, setQuizSkill] = useState("");

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  // AI Assistant States
  const [chatOpen, setChatOpen] = useState(false);
  const aiAnswers = {
    "what is python":
      "Python is a beginner-friendly programming language used for web development, AI, Machine Learning and Data Science.",

    "what is machine learning":
      "Machine Learning is a branch of AI where computers learn patterns from data and make predictions.",

    "what is ai":
      "Artificial Intelligence enables machines and computers to perform tasks that normally require human intelligence.",

    "what should i learn first":
      "You should start with the basics and follow the personalized roadmap shown by the system.",

    "how long will my learning path take":
      "The estimated learning duration depends on your selected skills, learning goal and hours available per week.",

    "what is my next skill":
      "Your next skill is displayed in the Next Recommended Action section based on your personalized learning sequence.",

    "how does this recommendation work":
      "The system compares your current skills with the skills required for your selected career goal and creates a chronological learning roadmap.",

    "what is a skill gap":
      "A skill gap is the difference between the skills you currently know and the skills required for your selected career goal.",

    "how do i complete a skill":
      "Complete the recommended course or project and then click the Mark Complete button to update your progress.",

    "what is cloud computing":
      "Cloud Computing means delivering computing services such as servers, storage and databases through the internet.",

    "what is aws":
      "AWS stands for Amazon Web Services. It provides cloud services such as EC2, S3, databases and many other services.",

    "what is docker":
      "Docker is a platform used to package applications and their dependencies into containers.",

    "what is devops":
      "DevOps combines software development and IT operations to improve and automate software development and deployment.",

    "what is react":
      "React is a JavaScript library used to build interactive user interfaces.",

    "what is data science":
      "Data Science involves collecting, analyzing and interpreting data to discover useful insights."

  };

  const [userMessage, setUserMessage] = useState("");
  const [userQuestion, setUserQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([])
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [chatMessages]);
  const handleAIQuestion = () => {
    if (!userMessage.trim()) return;

    const question = userMessage.toLowerCase().trim();

    const answer =
      aiAnswers[question] ||
      "Sorry, I do not have an answer for this question yet. Please ask about Python, AI, Machine Learning, AWS, Docker, DevOps, React, Data Science or your learning path.";

    setChatMessages([
      ...chatMessages,
      { sender: "user", text: userMessage },
      { sender: "ai", text: answer }
    ]);

    setUserMessage("");
  };

  const getRecommendationReason = (item) => {
    const reasons = [];

    // Reason based on user's career goal
    if (result?.goal) {
      reasons.push(
        `${item.skills?.join(", ") || item.title} is useful for your goal of ${result.goal}`
      );
    }

    // Reason based on prerequisites
    if (item.missing_prerequisites && item.missing_prerequisites.length > 0) {
      reasons.push(
        `You should complete ${item.missing_prerequisites.join(", ")} first before moving to ${item.title}`
      );
    } else if (item.prerequisites && item.prerequisites.length > 0) {
      reasons.push(
        `This topic builds on your previous knowledge of ${item.prerequisites.join(", ")}`
      );
    } else {
      reasons.push(
        `It is suitable for your current learning stage and does not require prerequisites`
      );
    }
    // Reason based on project
    if (item.project) {
      reasons.push(
        `The recommended project "${item.project}" will help you gain practical experience`
      );
    }

    return reasons;
  };
  // User Feedback States
  const [feedback, setFeedback] = useState("");
  const [showFeedbackOptions, setShowFeedbackOptions] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const [quizScores, setQuizScores] = useState({});
  const [adaptiveRecommendation, setAdaptiveRecommendation] = useState(null);
  const generateAdaptiveRecommendation = (currentScores) => {
    const scores = Object.values(currentScores);

    if (scores.length === 0) {
      setAdaptiveRecommendation(null);
      return;
    }

    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;

    if (averageScore < 1) {
      setAdaptiveRecommendation({
        level: "Beginner Support",
        message:
          "You should revise the previous concepts before moving to the next skill.",
        action: "Revise previous skill"
      });
    } else if (averageScore < 2) {
      setAdaptiveRecommendation({
        level: "Practice Required",
        message:
          "You understand the basics, but more practice is recommended.",
        action: "Practice with project"
      });
    } else {
      setAdaptiveRecommendation({
        level: "Ready to Advance",
        message:
          "Great performance! You are ready to continue with the next recommended skill.",
        action: "Continue to next skill"
      });
    }
  };
  const sendMessage = () => {
    if (!userMessage.trim()) return;

    const newUserMessage = {
      sender: "user",
      text: userMessage
    };

    setChatMessages((prev) => [...prev, newUserMessage]);

    const message = userMessage.toLowerCase();

    let aiReply = "";
    if (
      message.includes("my name") ||
      message.includes("what is my name") ||
      message.includes("who am i") ||
      message.includes("mera naam")
    ) {
      const userName = document.querySelector('input[placeholder="Enter your name"]')?.value?.trim();

      aiReply = userName
        ? `Your name is ${userName}. Nice to know you, ${userName}! 😊`
        : "You have not entered your name yet. Please enter your name in the profile form first.";
    }

    else if (message.includes("next")) {
      aiReply =
        "Based on your learning path, continue with the next recommended skill and complete its prerequisite topics first.";
    } else if (message.includes("project")) {
      aiReply =
        "I recommend completing a small project after learning the required concepts. Check your current learning path for the suggested project.";
    } else if (message.includes("skill")) {
      aiReply =
        "Your skill recommendations are based on your selected goals and current learning level. Complete the basics before moving to advanced topics.";
    } else if (message.includes("quiz")) {
      aiReply =
        "You can take the available skill quizzes to test your knowledge and identify areas where you need more practice.";

    } else if (
      message.includes("progress") ||
      message.includes("my progress") ||
      message.includes("overall progress")
    ) {
      aiReply = `Your overall progress is ${progressPercentage}%. You have completed ${completedCount} out of ${totalSkills} skills. You have ${remainingSkills} skills remaining.`;
    }
    else if (message.includes("aws")) {
      aiReply = "AWS stands for Amazon Web Services. It provides cloud services such as EC2, S3, databases and many other services.";
    }
    else if (message.includes("docker")) {
      aiReply = "Docker is a platform used to package applications and their dependencies into containers.";
    }
    else if (message.includes("devops")) {
      aiReply = "DevOps combines software development and IT operations to automate and improve software delivery.";
    }
    else if (message.includes("react")) {
      aiReply = "React is a JavaScript library used to build interactive user interfaces.";
    }
    else if (message.includes("data science")) {
      aiReply = "Data Science involves collecting, analyzing and interpreting data to discover useful insights.";
    }
    else {
      aiReply =
        "I can help you with your learning path, skills, projects, quizzes, AWS, Docker, DevOps, React, Data Science and next learning steps. Please ask me a question!";
    }


    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: aiReply
        }
      ]);
    }, 500);

    setUserMessage("");
  };
  const [quizScore, setQuizScore] = useState(null);
  const quizData = {
    Python: [
      {
        question: "Which keyword is used to define a function in Python?",
        options: ["func", "def", "function", "define"],
        answer: "def"
      },
      {
        question: "Which data type stores multiple values in Python?",
        options: ["list", "int", "float", "bool"],
        answer: "list"
      },
      {
        question: "What is the output type of input() in Python?",
        options: ["int", "string", "list", "float"],
        answer: "string"
      }
    ],

    JavaScript: [
      {
        question: "Which keyword declares a variable?",
        options: ["var", "define", "variable", "new"],
        answer: "var"
      },
      {
        question: "Which symbol is used for strict equality?",
        options: ["=", "==", "==="],
        answer: "==="
      },
      {
        question: "JavaScript is mainly used for?",
        options: ["Web development", "Only databases", "Operating systems", "Hardware"],
        answer: "Web development"
      }
    ],

    React: [
      {
        question: "What is React mainly used for?",
        options: ["Building user interfaces", "Managing databases", "Operating systems", "Networking"],
        answer: "Building user interfaces"
      },
      {
        question: "Which hook is used to manage state in React?",
        options: ["useState", "useEffect", "useFetch", "useData"],
        answer: "useState"
      },
      {
        question: "What does JSX allow?",
        options: ["Writing HTML-like code in JavaScript", "Creating databases", "Writing Python code", "Managing servers"],
        answer: "Writing HTML-like code in JavaScript"
      }
    ],

    "Node.js": [
      {
        question: "What is Node.js?",
        options: ["JavaScript runtime", "Database", "CSS framework", "Operating system"],
        answer: "JavaScript runtime"
      },
      {
        question: "Which language does Node.js use?",
        options: ["JavaScript", "Python", "Java", "C++"],
        answer: "JavaScript"
      },
      {
        question: "Which package manager is commonly used with Node.js?",
        options: ["npm", "pip", "maven", "composer"],
        answer: "npm"
      }
    ],

    "Express.js": [
      {
        question: "Express.js is mainly used for?",
        options: ["Building web servers and APIs", "Styling websites", "Database design", "Image editing"],
        answer: "Building web servers and APIs"
      },
      {
        question: "Express.js runs on?",
        options: ["Node.js", "Python", "Java", "PHP"],
        answer: "Node.js"
      },
      {
        question: "Which method is commonly used to create a GET route?",
        options: ["app.get()", "app.routeGet()", "get.app()", "server.fetch()"],
        answer: "app.get()"
      }
    ],

    MongoDB: [
      {
        question: "MongoDB is a?",
        options: ["NoSQL database", "Programming language", "Web browser", "Operating system"],
        answer: "NoSQL database"
      },
      {
        question: "MongoDB stores data in?",
        options: ["Documents", "Only rows", "Only arrays", "HTML files"],
        answer: "Documents"
      },
      {
        question: "Which format is similar to MongoDB documents?",
        options: ["JSON", "XML only", "CSV only", "TXT"],
        answer: "JSON"
      }
    ],

    HTML: [
      {
        question: "HTML is mainly used for?",
        options: ["Structuring web pages", "Styling pages", "Managing databases", "Server programming"],
        answer: "Structuring web pages"
      },
      {
        question: "Which tag creates a hyperlink?",
        options: ["<a>", "<p>", "<img>", "<div>"],
        answer: "<a>"
      }
    ],

    CSS: [
      {
        question: "CSS is mainly used for?",
        options: ["Styling web pages", "Database management", "Backend programming", "Server hosting"],
        answer: "Styling web pages"
      },
      {
        question: "Which property changes text color?",
        options: ["color", "font-style", "background", "margin"],
        answer: "color"
      }
    ],

    Java: [
      {
        question: "Java is a?",
        options: ["Programming language", "Database", "Browser", "Framework"],
        answer: "Programming language"
      },
      {
        question: "Which method is the entry point of a Java program?",
        options: ["main()", "start()", "run()", "init()"],
        answer: "main()"
      }
    ]

  };
  const startQuiz = (skill) => {
    console.log("Selected skill:", skill);
    console.log("Questions:", quizData[skill]);

    setQuizSkill(skill);
    setQuestions(quizData[skill] || []);
    setAnswers({});
    setQuizScore(null);
    setQuizOpen(true);
  };

  const selectAnswer = (questionIndex, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const submitQuiz = () => {
    let score = 0;

    questions.forEach((question, index) => {
      if (answers[index] === question.answer) {
        score++;
      }
    });

    setQuizScore(score);
  };
  const list = v => v.split(",").map(x => x.trim()).filter(Boolean);
  const completedCount = list(form.completed_courses).length;

  const totalSkills = result?.roadmap?.length + completedCount || 0;

  const remainingSkills = result?.roadmap?.length || 0;

  const progressPercentage =
    totalSkills > 0
      ? Math.round((completedCount / totalSkills) * 100)
      : 0;

  const toPayload = f => ({
    ...f,
    interests: list(f.interests),
    current_skills: list(f.current_skills),
    completed_courses: list(f.completed_courses),
    hours_per_week: Number(f.hours_per_week)
  });

  const fetchRecommend = async payload => {
    const res = await fetch(API + "/recommend", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.json();
  };

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      setResult(await fetchRecommend(toPayload(form)));
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async skill => {
    const startQuiz = skill => {
      const skillName = typeof skill === "string" ? skill : skill.skill;

      const skillQuestions = quizData[skillName];

      if (!skillQuestions) {
        alert(`Quiz is not available yet for ${skillName}`);
        return;
      }

      setQuizSkill(skillName);
      setQuestions(skillQuestions);
      setAnswers({});
      setQuizScore(null);
      setQuizOpen(true);
    };
    const selectAnswer = (questionIndex, answer) => {
      setAnswers(prev => ({
        ...prev,
        [questionIndex]: answer
      }));
    };
    const submitQuiz = () => {
      let score = 0;

      questions.forEach((question, index) => {
        if (answers[index] === question.answer) {
          score++;
        }
      });

      setQuizScore(score);

      if (score / questions.length >= 0.5) {
        setXp(prev => prev + score * 20);
      }
    };
    setLoading(true);

    try {
      const merged = {
        ...form,
        completed_courses: [...list(form.completed_courses), skill].join(", ")
      };

      setForm(merged);
      setResult(await fetchRecommend(toPayload(merged)));

      const newXp = xp + 20;
      setXp(newXp);

      if (newXp >= 20 && !badges.includes("First Step")) {
        setBadges(prev => [...prev, "First Step"]);
      }

      if (newXp >= 50 && !badges.includes("Learning Star")) {
        setBadges(prev => [...prev, "Learning Star"]);
      }

      if (newXp >= 100 && !badges.includes("AI Champion")) {
        setBadges(prev => [...prev, "AI Champion"]);
      }

    } finally {
      setLoading(false);
    }
  };

  const change = (k, v) => setForm({ ...form, [k]: v });

  return <main>
    <h1>AI-Powered Personalized Learning Path</h1>
    <p className="sub">Enter your profile and generate a prerequisite-aware, chronological learning roadmap.</p>
    <div className="xp-card">
      <div className="analytics-card">
        <h3>📊 Learning Analytics</h3>

        <div className="analytics-grid">

          <div className="stat-card">
            <span>📊 Overall Progress</span>
            <strong>{progressPercentage}%</strong>
          </div>

          <div className="stat-card">
            <span>✅ Completed Skills</span>
            <strong>{completedCount}</strong>
          </div>

          <div className="stat-card">
            <span>🎯 Remaining Skills</span>
            <strong>{remainingSkills}</strong>
          </div>

          <div className="stat-card">
            <span>📚 Total Skills</span>
            <strong>{totalSkills}</strong>
          </div>

          <div className="stat-card">
            <span>⚡ Total XP</span>
            <strong>{xp} XP</strong>
          </div>

          <div className="stat-card">
            <span>🏆 Badges Earned</span>
            <strong>{badges.length}</strong>
          </div>
          {adaptiveRecommendation && (
            <div className="adaptive-card">
              <div className="adaptive-header">
                <span className="adaptive-icon">🤖</span>

                <div>
                  <h3>Adaptive Recommendation</h3>
                  <strong>{adaptiveRecommendation.level}</strong>
                </div>
              </div>

              <p>{adaptiveRecommendation.message}</p>

              <div className="adaptive-action">
                💡 Recommended Action: {adaptiveRecommendation.action}
              </div>
            </div>
          )}
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <p className="progress-text">
          You have completed {completedCount} out of {totalSkills} skills.
        </p>
      </div>
      <h3>🏆 Your Learning Progress</h3>
      <p>⭐ XP: {xp}</p>

      <div className="badges">
        <strong>Badges:</strong>

        {badges.length === 0 ? (
          <span> Complete skills to earn badges!</span>
        ) : (
          badges.map((badge, index) => (
            <span className="badge" key={index}>
              🏅 {badge}
            </span>
          ))
        )}
      </div>
    </div>
    <form onSubmit={submit}>

      <input
        className="name-input"
        placeholder="Enter your name"
        value={form.name}
        onChange={e => change('name', e.target.value)}
      />

      {form.name.trim() && (
        <div className="welcome-user">
          <h2>👋 Hello, {form.name}!</h2>
          <p>Let's start building your personalized learning journey.</p>
        </div>
      )}

      <input
        type="date"
        value={form.start_date}
        onChange={e => change('start_date', e.target.value)}
      />

      <select value={form.goal} onChange={e => change("goal", e.target.value)}>
        {["Machine Learning Engineer", "Data Scientist", "Data Analyst", "AI Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", " Cloud Engineer"].map(x => <option key={x}>{x}</option>)}
      </select>
      <input placeholder="Interests (comma separated)" value={form.interests} onChange={e => change("interests", e.target.value)} />
      <input placeholder="Current skills (comma separated)" value={form.current_skills} onChange={e => change("current_skills", e.target.value)} />
      <input placeholder="Completed courses" value={form.completed_courses} onChange={e => change("completed_courses", e.target.value)} />
      <select value={form.experience_level} onChange={e => change("experience_level", e.target.value)}>
        <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
      </select>
      <input type="number" min="1" max="80" value={form.hours_per_week} onChange={e => change("hours_per_week", e.target.value)} />
      <textarea placeholder="Optional feedback: where are you struggling?" value={form.feedback} onChange={e => change("feedback", e.target.value)} />
      <button>{loading ? "Generating..." : "Generate My Learning Path"}</button>
    </form>

    {result && <section>
      {/* ---- Dashboard: overall progress ---- */}
      <div className="card hero">
        <h2>{result.recognized_goal}</h2>
        <div className="progressbar">
          <div className="progressbar-fill" style={{ width: `${result.progress_percent}%` }} />
        </div>
        <p className="progress-label">Overall goal progress: {result.progress_percent}%</p>
        <p><b>Skill gap:</b> {result.skill_gap.join(", ") || "No remaining skill gaps 🎉"}</p>
      </div>

      {/* ---- Dashboard: current position ---- */}
      {result.current_position && <div className="card">
        <h2>Your Current Position</h2>
        <div className="position-grid">
          <div><span className="pos-label">Completed</span><span className="pos-value">{result.current_position.completed_count} Skills</span></div>
          <div><span className="pos-label">Current</span><span className="pos-value">{result.current_position.current_skill || "—"}</span></div>
          <div><span className="pos-label">Next</span><span className="pos-value">{result.current_position.next_skill || "—"}</span></div>
          <div><span className="pos-label">Remaining</span><span className="pos-value">{result.current_position.remaining_count} Skills</span></div>
          <div><span className="pos-label">Estimated Path</span><span className="pos-value">{result.current_position.estimated_weeks_remaining} weeks</span></div>
        </div>
      </div>}

      {/* ---- Dashboard: milestone progress chart ---- */}
      {result.progress_chart && result.progress_chart.length > 1 && <div className="card">
        <h2>Learning Progress</h2>
        <p className="badge">Illustrative progress across chronological roadmap milestones.</p>
        <div className="chart">
          {result.progress_chart.map((p, i) =>
            <div className="chart-col" key={i}>
              <div className="chart-bar-track">
                <div className="chart-bar-fill" style={{ height: `${p.percent}%` }} />
              </div>
              <span className="chart-pct">{p.percent}%</span>
              <span className="chart-label">{p.label}</span>
            </div>
          )}
        </div>
      </div>}

      {/* ---- Dashboard: skill status table ---- */}
      {result.skill_status && <div className="card">
        <h2>Skill Status</h2>
        <table className="status-table">
          <tbody>
            {result.skill_status.map(s => {
              const meta = STATUS_META[s.status] || STATUS_META.locked;
              return <tr key={s.skill}>
                <td>{s.skill}</td>
                <td><span className={`pill ${meta.cls}`}>{meta.icon} {meta.label}</span></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>}

      {/* ---- Next recommended action ---- */}
      <h2>Next Recommended Action</h2>
      {result.next_action && <div className="card">
        <b>{result.next_action.course}</b>
        <p>Skill: {result.next_action.skill}</p>
        <p>Duration: {result.next_action.duration_weeks} weeks</p>
        <p>Project: {result.next_action.project}</p>
        <button type="button" className="complete-btn" onClick={() => markComplete(result.next_action.skill)}>
          Mark "{result.next_action.skill}" Complete
        </button>
      </div>}

      {/* ---- Chronological roadmap ---- */}

      <h2 className="roadmap-title">
        🗺️ Personalized Roadmap
        <span>Learn step by step in chronological order</span>
      </h2>

      <div className="roadmap">
        {result.roadmap.map((x, index) => {

          const icons = ["🔢", "🐼", "📊", "🤖", "🧠"];

          return (
            <div
              className={`roadmap-card ${x.milestone === 1 ? "current-roadmap-card" : ""
                }`}
              key={x.milestone}
            >
              <div className="roadmap-top">
                <span className="step-badge">
                  STEP {String(x.milestone).padStart(2, "0")}
                </span>

                {x.milestone === 1 && (
                  <span className="start-badge">● START HERE</span>
                )}
              </div>

              <div className="roadmap-icon">
                {icons[index] || "📚"}
              </div>

              <p className="roadmap-level">
                Milestone {x.milestone} · {x.level}
              </p>

              <h3>{x.course}</h3>

              <div className="roadmap-info">
                <span className="info-icon">🎯</span>

                <div>
                  <small>LEARN</small>
                  <p>{x.skill}</p>
                </div>
              </div>

              <div className="roadmap-info">
                <span className="info-icon">⏱️</span>

                <div>
                  <small>ESTIMATED TIME</small>
                  <p>{x.duration_weeks} weeks</p>
                </div>
              </div>

              <div className="project-box">
                <span>🚀 PROJECT</span>
                <p>{x.project}</p>
              </div>

              <div className="roadmap-footer">
                {x.milestone === 1
                  ? "Start your learning journey →"
                  : `Complete Step ${x.milestone - 1} first`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Skill Assessment Section */}
      <div className="quiz-section">
        <h2>📝 Skill Assessment Quiz</h2>
        {quizOpen && (
          <div className="quiz-container">
            <h2>📝 {quizSkill} Quiz</h2>

            {questions.map((question, questionIndex) => (
              <div className="quiz-question" key={questionIndex}>
                <h3>
                  Question {questionIndex + 1}: {question.question}
                </h3>

                {question.options.map((option, optionIndex) => (
                  <button
                    key={optionIndex}
                    className={
                      answers[questionIndex] === option
                        ? "selected-option"
                        : "quiz-option"
                    }
                    onClick={() => selectAnswer(questionIndex, option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ))}
            {quizData[quizSkill] && quizData[quizSkill].length > 0 ? (
              quizData[quizSkill].map((q, index) => (
                <div className="question-card" key={index}>
                  <h3>
                    Question {index + 1}: {q.question}
                  </h3>

                  {q.options.map((option, optionIndex) => (
                    <button key={optionIndex}>
                      {option}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <p>No questions available for {quizSkill}</p>
            )}
            {quizScore === null ? (
              <button className="submit-quiz-btn" onClick={submitQuiz}>
                Submit Quiz
              </button>
            ) : (
              <div className="quiz-result">
                <h2>
                  🎉 Your Score: {quizScore} / {questions.length}
                </h2>

                <button
                  onClick={() => setQuizOpen(false)}
                >
                  Close Quiz
                </button>
              </div>
            )}
          </div>
        )}

        <p>
          Test your knowledge and check your understanding before moving ahead.
        </p>

        <div className="quiz-skill-buttons">
          <button onClick={() => startQuiz("Python")}>🐍 Python Quiz</button>

          <button onClick={() => startQuiz("JavaScript")}>🟨 JavaScript Quiz</button>

          <button onClick={() => startQuiz("React")}>⚛️ React Quiz</button>

          <button onClick={() => startQuiz("Node.js")}>🟢 Node.js Quiz</button>

          <button onClick={() => startQuiz("Express.js")}>🚀 Express.js Quiz</button>

          <button onClick={() => startQuiz("MongoDB")}>🍃 MongoDB Quiz</button>

          <button onClick={() => startQuiz("HTML")}>🌐 HTML Quiz</button>

          <button onClick={() => startQuiz("CSS")}>🎨 CSS Quiz</button>

          <button onClick={() => startQuiz("Java")}>☕ Java Quiz</button>


        </div>
      </div>
      {/* ---- TF-IDF resource recommendations for the unlocked horizon ---- */}
      <h2>Suggested Resources for Your Current Stage</h2>
      <div className="grid">
        {result.recommendations.map(x => <div className="card" key={x.id}>
          <h3>{x.title}</h3>
          <p>{x.skills.join(", ")}</p>
          <p>Prerequisites: {x.prerequisites.join(", ") || "None"}</p>
          {x.missing_prerequisites.length > 0 && <p className="warn">Complete first: {x.missing_prerequisites.join(", ")}</p>}
          <p>Project: {x.project}</p>
          <div className="recommendation-reason">
            <h4>💡 Why was this recommended?</h4>

            {getRecommendationReason(x).map((reason, index) => (
              <p key={index} className="reason-item">
                ✓ {reason}
              </p>
            ))}
          </div>
        </div>)}
      </div>
    </section>}
    {/* User Feedback Section */}
    <section className="feedback-section">
      {!feedbackSubmitted ? (
        <div className="feedback-main">
          <div className="feedback-text">
            <h3>Was this learning path helpful?</h3>
            <p>Your feedback helps us improve future recommendations.</p>
          </div>

          <div className="feedback-buttons">
            <button
              type="button"
              className="helpful-btn"
              onClick={() => {
                setFeedback("Helpful");
                setFeedbackSubmitted(true);
                setShowFeedbackOptions(false);
              }}
            >
              👍 Helpful
            </button>

            <button
              type="button"
              className="not-helpful-btn"
              onClick={() => {
                setFeedback("Not Helpful");
                setShowFeedbackOptions(true);
              }}
            >
              👎 Not Helpful
            </button>
          </div>
        </div>
      ) : (
        <div className="feedback-success">
          <span>✅</span>
          <div>
            <strong>Thank you for your feedback!</strong>
            <p>Your preference: {feedback}</p>
          </div>
        </div>
      )}

      {showFeedbackOptions && !feedbackSubmitted && (
        <div className="feedback-options">
          <h4>How should we improve your learning path?</h4>

          <div className="feedback-option-buttons">
            <button
              type="button"
              onClick={() => {
                setFeedback("Easier content");
                setFeedbackSubmitted(true);
              }}
            >
              📚 Easier content
            </button>

            <button
              type="button"
              onClick={() => {
                setFeedback("More practical projects");
                setFeedbackSubmitted(true);
              }}
            >
              💻 More practical projects
            </button>

            <button
              type="button"
              onClick={() => {
                setFeedback("Faster learning path");
                setFeedbackSubmitted(true);
              }}
            >
              ⚡ Faster learning path
            </button>

            <button
              type="button"
              onClick={() => {
                setFeedback("More advanced content");
                setFeedbackSubmitted(true);
              }}
            >
              🚀 More advanced content
            </button>
          </div>
        </div>
      )}
    </section>
    {/* AI Assistant - ADD HERE */}
    <div className="ai-assistant">
      {/* Floating AI Assistant */}
      <button
        className="ai-floating-btn"
        onClick={() => setChatOpen(!chatOpen)}
      >
        🤖
      </button>

      {chatOpen && (
        <div className="ai-chat-popup">

          <div className="ai-chat-header">
            <div>
              <h3>🤖 AI Learning Assistant</h3>
              <span>Ask me about your learning journey</span>
            </div>

            <button
              className="close-chat-btn"
              onClick={() => setChatOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="ai-chat-messages">
            {chatMessages.length === 0 ? (
              <div className="welcome-message">
                👋 Hi! How can I help with your learning path?
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`chat-message ${message.sender}`}
                >
                  {message.text}
                </div>
              ))
            )}
            <div ref={chatEndRef}></div>
          </div>

          <div className="ai-chat-input">
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Ask about courses, skills, projects..."
            />

            <button onClick={handleAIQuestion}>
              Send
            </button>
          </div>

        </div>
      )}
    </div>
  </main>
}
createRoot(document.getElementById("root")).render(<App />);
