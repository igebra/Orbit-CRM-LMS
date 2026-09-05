"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import styles from "./courses.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Track = {
  title: string;
  grades?: string;
  level?: string;
  topics: string[];
};

type Course = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  brochure: string;
  priceLabel: string;
  pricing: string[];
  audience: string;
  levels: string;
  classes: string;
  frequency: string;
  duration: string;
  format: string[];
  tracks: Track[];
  note?: string;
};

const COURSES: Course[] = [
  {
    id: "aiedge",
    name: "AiEdge",
    tagline: "Learn AI. Create With It. Think Future.",
    description:
      "AI-first learning pathway that progresses from AI foundations to generative AI, machine learning, LLMs, agentic AI and advanced AI systems.",
    brochure: "/brochures/aiedge-brochure.pdf",
    priceLabel: "$499 / Level",
    pricing: ["$499 per level"],
    audience: "Grades 4–10",
    levels: "3 levels per school group",
    classes: "20 classes per level",
    frequency: "1 class / week",
    duration: "90 minutes / class",
    format: [
      "Live Online Mini Group Classes",
      "Highly qualified, passionate trainers",
      "High-quality video backup to revise anytime",
    ],
    tracks: [
      {
        title: "Elementary",
        grades: "Grades 4–5",
        level: "Level 1",
        topics: [
          "What Is AI",
          "History of AI",
          "AI Applications in Daily Life",
          "AI vs Human Intelligence",
          "AI in Different Industries",
          "Different Types of AI",
          "What AI Can and Can’t Do",
          "How Smart Assistants Work",
          "Projects",
        ],
      },
      {
        title: "Elementary",
        grades: "Grades 4–5",
        level: "Level 2",
        topics: [
          "What Is Generative AI",
          "What Is a Prompt?",
          "Image Generation with AI",
          "Video Creation Using AI",
          "AI-Powered Music Making",
          "How AI Generates Content",
          "Ethical Use of AI Creations",
          "Design & Data Thinking – Atoms",
          "Projects",
        ],
      },
      {
        title: "Elementary",
        grades: "Grades 4–5",
        level: "Level 3",
        topics: [
          "What is Data",
          "Types of Data",
          "What Is Machine Learning?",
          "What Is Deep Learning?",
          "Input-Output in AI Systems",
          "Real-World AI Use Cases",
          "Introduction to CAVs",
          "Design Thinking for Kids",
          "Responsible Use of AI",
          "Building an AI-Powered Idea",
        ],
      },
      {
        title: "Middle School",
        grades: "Grades 6–8",
        level: "Level 1",
        topics: [
          "Learn in-depth about AI",
          "AI vs Traditional Programming",
          "What Is Machine Learning",
          "Types of Machine Learning",
          "What Is Deep Learning",
          "How Neural Networks Work",
          "Projects",
        ],
      },
      {
        title: "Middle School",
        grades: "Grades 6–8",
        level: "Level 2",
        topics: [
          "Understanding GenAI Models",
          "Creating Content with Multimodal Generative AI Models",
          "What Is Prompt Engineering?",
          "How Diffusion Models Work",
          "Design & Data Thinking – DNA",
          "Projects",
        ],
      },
      {
        title: "Middle School",
        grades: "Grades 6–8",
        level: "Level 3",
        topics: [
          "What Is NLP?",
          "What Is LLM?",
          "What Is Transformer?",
          "Intro to Algorithms & Decision Trees",
          "What Is Agentic AI",
          "AI in the Future – Trends and Possibilities",
          "Ethics in AI – Deepfakes, Privacy, Misinformation",
        ],
      },
      {
        title: "High School",
        grades: "Grades 9–10",
        level: "Level 1",
        topics: [
          "Evolution of AI and Current Landscape",
          "Machine Learning vs Deep Learning",
          "Deep Learning Architectures",
          "AI in Robotics & Automation",
          "Mathematics Behind AI – Algebra, Probability, Logic",
          "AI Use Cases in STEM Industry",
          "Projects",
        ],
      },
      {
        title: "High School",
        grades: "Grades 9–10",
        level: "Level 2",
        topics: [
          "Foundation Models and Transfer Learning",
          "Fine-Tuning vs Prompt Tuning",
          "Architecture of LLMs – Transformers & Attention",
          "Prompt Engineering – Zero-shot, Few-shot, Chain-of-Thought",
          "Bias, Hallucinations and Safety Challenges in LLMs",
        ],
      },
      {
        title: "High School",
        grades: "Grades 9–10",
        level: "Level 3",
        topics: [
          "LLM Optimization Techniques",
          "Multi-Agent Systems",
          "AI for Scientific Discovery & Simulation",
          "Introduction to Quantum Computing",
          "Quantum vs Classical Computing",
          "Quantum Randomness and Superposition",
          "Building Scalable AI Systems – APIs, Pipelines & Deployment",
        ],
      },
    ],
  },
  {
    id: "coding4ai",
    name: "Coding4AI",
    tagline: "Code Smart. Think AI. Build the Future.",
    description:
      "Coding-first pathway beginning with Python foundations and progressing through data, machine learning, deep learning, generative AI and applied projects.",
    brochure: "/brochures/coding4ai-brochure.pdf",
    priceLabel: "$499 / Level",
    pricing: ["$499 per level"],
    audience: "Grades 4–10",
    levels: "3 levels per school group",
    classes: "20 classes per level",
    frequency: "1 class / week",
    duration: "90 minutes / class",
    format: [
      "Live Online Mini Group Classes",
      "Highly qualified, passionate trainers",
      "High-quality video backup to revise anytime",
    ],
    tracks: [
      {
        title: "Elementary",
        grades: "Grades 4–5",
        level: "Level 1",
        topics: [
          "Python and first line of code",
          "Print, Input & Variables",
          "Numbers and Strings",
          "If-Else Statements",
          "For and While Loops",
          "Turtle Graphics",
          "Lists",
          "Random",
          "Project",
        ],
      },
      {
        title: "Elementary",
        grades: "Grades 4–5",
        level: "Level 2",
        topics: [
          "Python Basics Review",
          "Error Debugging",
          "Interactive Stories",
          "Turtle Patterns and Shapes",
          "Timers, Counters and Mini Game Logic",
          "Simple Animations with Loops",
          "Project",
        ],
      },
      {
        title: "Elementary",
        grades: "Grades 4–5",
        level: "Level 3",
        topics: [
          "AI and Real-Life Examples",
          "Rule-Based AI Chatbot",
          "Data in Python",
          "Image Classification with Teachable Machine",
          "Voice Commands using Speech Recognition",
          "Simulating Smart Behaviour with Randomness",
          "Project",
        ],
      },
      {
        title: "Middle School",
        grades: "Grades 6–8",
        level: "Level 1",
        topics: [
          "Programming & Python",
          "Variables, Data Types & Inputs",
          "Operators and Expressions",
          "Conditionals",
          "Loops",
          "Functions",
          "Lists, Dictionaries and Tuples",
          "Strings",
          "Debugging",
          "Turtle",
          "File I/O",
          "Game Logic",
          "Random & Time Modules",
          "Math with Python",
          "IDEs",
          "Projects",
        ],
      },
      {
        title: "Middle School",
        grades: "Grades 6–8",
        level: "Level 2",
        topics: [
          "Advanced Lists & Comprehensions",
          "CSV & JSON",
          "NumPy Basics",
          "Matplotlib",
          "pandas DataFrames",
          "Statistics Essentials",
          "Data Cleaning",
          "Data Projects",
          "Machine Learning Introduction",
          "First ML Model",
          "Classification",
          "Regression",
          "Model Evaluation",
          "Projects",
        ],
      },
      {
        title: "Middle School",
        grades: "Grades 6–8",
        level: "Level 3",
        topics: [
          "AI vs ML vs DL",
          "Neural Networks",
          "Image, Text and Sound in AI",
          "TensorFlow/Keras",
          "Simple Neural Network",
          "Image and Text Training",
          "Audio Projects",
          "Generative AI",
          "Chatbots with Pre-trained Models",
          "Projects",
          "Portfolio Website",
        ],
      },
      {
        title: "High School",
        grades: "Grades 9–10",
        level: "Level 1",
        topics: [
          "Python Setup, Syntax and IDEs",
          "Variables and Data Types",
          "Operators and Logical Expressions",
          "Conditionals and Loops",
          "Functions",
          "Strings",
          "Lists and Comprehensions",
          "Dictionaries, Sets and Tuples",
          "Modules and Libraries",
          "Error Handling",
          "File I/O",
          "OOP Basics",
          "Recursion and Lambda Functions",
          "Turtle Graphics",
          "Terminal Games",
          "External APIs",
          "Project Planning and Debugging",
          "Command-Line Tool",
          "Capstone Project",
        ],
      },
      {
        title: "High School",
        grades: "Grades 9–10",
        level: "Level 2",
        topics: [
          "Python Structures & OOP Recap",
          "CSV, JSON and APIs",
          "NumPy",
          "pandas",
          "Data Cleaning & Wrangling",
          "Exploratory Data Analysis",
          "Visualization",
          "Probability & Statistics for AI",
          "Machine Learning",
          "Classification, Regression and Clustering",
          "Model Evaluation",
          "Feature Engineering",
          "Streamlit/Gradio ML App",
          "Recommendation System",
          "Real-World Datasets",
          "AI Ethics",
          "Capstone Project",
        ],
      },
      {
        title: "High School",
        grades: "Grades 9–10",
        level: "Level 3",
        topics: [
          "Machine Learning Pipeline & Ethics",
          "Neural Networks & Activation Functions",
          "TensorFlow/Keras",
          "Fully Connected Networks",
          "Regularization and Dropout",
          "CNNs",
          "RNNs",
          "Transformers and Language Models",
          "Generative AI",
          "Prompt Engineering",
          "Text and Image Generation Projects",
          "Fine-Tuning",
          "Voice Assistant / AI Podcast Narrator",
          "Generative AI Ethics",
          "AI for Good",
          "AI Careers",
          "Capstone Project",
        ],
      },
    ],
  },
  {
    id: "math",
    name: "Math",
    tagline: "School Math + Concept Clarity + Exam Confidence",
    description:
      "Year-long school mathematics support with curriculum-aligned teaching, revision support, PTMs and supplementary live classes.",
    brochure: "/brochures/math-brochure.pdf",
    priceLabel: "From $129 / Month",
    pricing: [
      "$129 / month — Grades 1–4",
      "$169 / month — Grades 5–8",
      "$199 / month — Grades 7–10 (as listed in brochure)",
    ],
    audience: "Grades 1–10 + advanced high-school mathematics",
    levels: "Grade / subject based",
    classes: "Year-long program — total class count not stated in brochure",
    frequency: "1 class / week",
    duration: "60 minutes / class",
    format: [
      "Live Online Classes for Grades 1 to 10",
      "100% aligned with US, Canada and IB school standards",
      "High-quality video backup to revise anytime",
      "Supplementary live math classes for additional support",
      "Highly qualified, passionate & trained math tutors",
      "Regular PTMs",
    ],
    note:
      "Pricing note: the brochure lists Grades 5–8 at $169/month and Grades 7–10 at $199/month, so Grades 7–8 overlap. Orbit displays the brochure wording until the pricing band is confirmed.",
    tracks: [
      { title: "Grade 1", topics: ["Number & Place Value","Addition & Subtraction","Measurement & Data Handling","Geometry"] },
      { title: "Grade 2", topics: ["Number Systems","Addition & Subtraction","Multiplication & Division","Geometry","Measurement & Data Handling"] },
      { title: "Grade 3", topics: ["Number Systems","Addition & Subtraction","Multiplication","Division","Fractions","Measurement & Data Handling","Geometry"] },
      { title: "Grade 4", topics: ["Number Systems","Operations & Algebraic Thinking","Fractions","Decimals","Measurement","Geometry","Coordinate Geometry","Data, Statistics & Probability"] },
      { title: "Grade 5", topics: ["Integers","Fractions","Decimals","Introduction to Pre-Algebra","Ratios, Proportions & Percent","Measurement & Volume","Geometry & Coordinate Plane","Data & Probability"] },
      { title: "Grade 6", topics: ["Numbers & Operations","Ratios & Proportional Relationships","Algebraic Thinking","Exponents","Geometry","Statistics & Data Analysis","Probability","Financial Literacy"] },
      { title: "Grade 7", topics: ["Number System","Ratios & Proportional Relationships","Percentages","Algebraic Thinking","Geometry","Statistics & Data Analysis","Probability"] },
      { title: "Grade 8", topics: ["Number System","Exponents & Scientific Notation","Equations & Algebraic Thinking","Functions","Geometry","Statistics & Data Analysis"] },
      { title: "Algebra I", topics: ["Expressions, Equations & Quantitative Reasoning","Linear & Exponential Functions","Descriptive Statistics","Quadratic Functions & Modeling","Linear, Quadratic & Exponential Models","Algebra–Geometry Connections","Piecewise & Transformed Functions"] },
      { title: "Algebra II", topics: ["Number Systems & Exponents","Equations & Inequalities","Functions","Systems","Polynomials","Rational Expressions & Functions","Exponential & Logarithmic Functions","Conic Sections","Sequences, Series & Probability","Statistics & Data Analysis"] },
      { title: "Geometry", topics: ["Congruence, Proof & Constructions","Similarity, Proof & Trigonometry","Three Dimensions","Algebra & Geometry Connections","Circles & Coordinates"] },
      { title: "Precalculus", topics: ["Functions & Graphs","Polynomial & Rational Functions","Exponential & Logarithmic Functions","Trigonometric Functions","Trigonometric Identities & Equations","Vectors, Matrices & Parametrics"] },
      { title: "AP Calculus AB / BC", topics: ["Limits & Continuity","Differentiation","Applications of Derivatives","Integration & Accumulation","Differential Equations","Applications of Integration","Advanced Integration","Parametric, Polar & Vector Functions","Infinite Sequences & Series"] },
      { title: "AP Statistics", topics: ["One-Variable Data","Two-Variable Data","Collecting Data","Probability","Sampling Distributions","Inference for Means","Inference for Proportions","Chi-Square","Inference for Slopes"] },
    ],
  },
];

export default function CoursesPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [trackFilter, setTrackFilter] = useState("All");

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/");
        return;
      }
      setEmail(data.user.email || "");
    }
    init();
  }, [router]);

  const filteredTracks = useMemo(() => {
    if (!selectedCourse || trackFilter === "All") return selectedCourse?.tracks || [];
    return selectedCourse.tracks.filter((track) => track.title === trackFilter);
  }, [selectedCourse, trackFilter]);

  function openCourse(course: Course) {
    setSelectedCourse(course);
    setTrackFilter("All");
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="courses" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>LMS · COURSE CATALOGUE</p>
            <h1>Courses</h1>
            <p>
              Program structure, pricing, levels, curriculum and official brochures.
            </p>
          </div>
          <div className={styles.courseCount}>3 Courses</div>
        </header>

        <section className={styles.courseGrid}>
          {COURSES.map((course) => (
            <article className={styles.courseCard} key={course.id}>
              <div className={`${styles.courseTop} ${styles[course.id]}`}>
                <span className={styles.courseType}>iGebra Program</span>
                <h2>{course.name}</h2>
                <p>{course.tagline}</p>
              </div>

              <div className={styles.courseBody}>
                <p className={styles.description}>{course.description}</p>

                <div className={styles.metrics}>
                  <div><span>Audience</span><strong>{course.audience}</strong></div>
                  <div><span>Structure</span><strong>{course.levels}</strong></div>
                  <div><span>Classes</span><strong>{course.classes}</strong></div>
                  <div><span>Class Length</span><strong>{course.duration}</strong></div>
                </div>

                <div className={styles.price}>{course.priceLabel}</div>

                <div className={styles.actions}>
                  <button className={styles.primary} onClick={() => openCourse(course)}>
                    View Course Details
                  </button>
                  <a href={course.brochure} target="_blank" rel="noreferrer" className={styles.secondary}>
                    View Brochure
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.quickSummary}>
          <div>
            <span>AiEdge</span>
            <strong>3 Groups × 3 Levels</strong>
            <small>20 classes / level · $499 / level</small>
          </div>
          <div>
            <span>Coding4AI</span>
            <strong>3 Groups × 3 Levels</strong>
            <small>20 classes / level · $499 / level</small>
          </div>
          <div>
            <span>Math</span>
            <strong>Year-long</strong>
            <small>Grades 1–10 + advanced math · from $129/month</small>
          </div>
        </section>
      </main>

      {selectedCourse && (
        <div className={styles.backdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalEyebrow}>COURSE DETAILS</span>
                <h2>{selectedCourse.name}</h2>
                <p>{selectedCourse.tagline}</p>
              </div>
              <button className={styles.close} onClick={() => setSelectedCourse(null)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <section className={styles.summaryGrid}>
                <div><span>Audience</span><strong>{selectedCourse.audience}</strong></div>
                <div><span>Levels / Structure</span><strong>{selectedCourse.levels}</strong></div>
                <div><span>Total Classes</span><strong>{selectedCourse.classes}</strong></div>
                <div><span>Frequency</span><strong>{selectedCourse.frequency}</strong></div>
                <div><span>Duration</span><strong>{selectedCourse.duration}</strong></div>
                <div><span>Price</span><strong>{selectedCourse.priceLabel}</strong></div>
              </section>

              <div className={styles.twoCol}>
                <section className={styles.infoCard}>
                  <h3>Program Details</h3>
                  <ul>
                    {selectedCourse.format.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>

                <section className={styles.infoCard}>
                  <h3>Pricing</h3>
                  <ul>
                    {selectedCourse.pricing.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  {selectedCourse.note && <div className={styles.note}>{selectedCourse.note}</div>}
                </section>
              </div>

              <section className={styles.curriculumSection}>
                <div className={styles.curriculumHeader}>
                  <div>
                    <h3>Curriculum</h3>
                    <p>Major topics from the current official brochure.</p>
                  </div>

                  {selectedCourse.id !== "math" && (
                    <select value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)}>
                      <option>All</option>
                      <option>Elementary</option>
                      <option>Middle School</option>
                      <option>High School</option>
                    </select>
                  )}
                </div>

                <div className={styles.trackGrid}>
                  {filteredTracks.map((track, index) => (
                    <article className={styles.trackCard} key={`${track.title}-${track.level || index}`}>
                      <div className={styles.trackTitle}>
                        <div>
                          <h4>{track.title}</h4>
                          {track.grades && <span>{track.grades}</span>}
                        </div>
                        {track.level && <strong>{track.level}</strong>}
                      </div>
                      <ul>
                        {track.topics.map((topic) => <li key={topic}>{topic}</li>)}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <div className={styles.modalFooter}>
              <a href={selectedCourse.brochure} target="_blank" rel="noreferrer" className={styles.primary}>
                View Official Brochure
              </a>
              <button className={styles.secondary} onClick={() => setSelectedCourse(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
