import { useEffect, useRef, useState } from "react";

type Screen = "home" | "levels" | "game" | "result";
type Modal = "how" | "settings" | "profile" | "pause" | null;

type Question = {
  minuend: number;
  subtrahend: number;
  answer: number;
  options: number[];
};

type LevelProgress = Record<number, { best: number; stars: number }>;

const LEVELS = [
  { level: 1, range: "1 - 20", color: "blue" },
  { level: 2, range: "21 - 40", color: "pink" },
  { level: 3, range: "41 - 60", color: "orange" },
  { level: 4, range: "61 - 80", color: "green" },
  { level: 5, range: "81 - 100", color: "purple" },
] as const;

const ANSWER_COLORS = ["yellow", "blue", "pink"];

function createQuestions(level: number): Question[] {
  let seed = level * 9341;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const max = level * 20;
  const min = level === 1 ? 5 : (level - 1) * 20 + 1;
  const used = new Set<string>();
  const questions: Question[] = [];

  while (questions.length < 10) {
    const minuend = Math.floor(min + random() * (max - min + 1));
    const subtrahend = Math.floor(1 + random() * (minuend - 1));
    const key = `${minuend}-${subtrahend}`;
    if (used.has(key)) continue;
    used.add(key);

    const answer = minuend - subtrahend;
    const options = new Set<number>([answer]);
    const offsets = [-3, -2, -1, 1, 2, 3, 4, -4];
    while (options.size < 3) {
      const offset = offsets[Math.floor(random() * offsets.length)];
      const candidate = Math.max(0, Math.min(100, answer + offset));
      if (candidate !== answer) options.add(candidate);
    }

    const shuffled = [...options];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    questions.push({ minuend, subtrahend, answer, options: shuffled });
  }

  return questions;
}

function getStars(correct: number) {
  if (correct >= 9) return 3;
  if (correct >= 7) return 2;
  if (correct >= 5) return 1;
  return 0;
}

function loadProgress(): LevelProgress {
  try {
    return JSON.parse(localStorage.getItem("pengurangan-progress") || "{}") as LevelProgress;
  } catch {
    return {};
  }
}

type IconName =
  | "arrow-left"
  | "check"
  | "close"
  | "help"
  | "home"
  | "next"
  | "pause"
  | "play"
  | "replay"
  | "settings"
  | "trash"
  | "user"
  | "volume"
  | "volume-off";

function Icon({ name, size = 28 }: { name: IconName; size?: number }) {
  const shared = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, React.ReactNode> = {
    "arrow-left": <><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.6 1.9c-.9.5-1.4 1-1.4 2.1" /><path d="M12 17h.01" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    next: <><path d="m9 18 6-6-6-6" /><path d="M15 12H5" /></>,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
    play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    replay: <><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 1-2-5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.6v.2H10V21A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 3 13.9h-.2V10H3a1.8 1.8 0 0 0 1.6-1A1.8 1.8 0 0 0 4.2 7l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10.1 3v-.2H14V3A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1h.2v3.9H21a1.8 1.8 0 0 0-1.6 1.1Z" /></>,
    trash: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="m6 7 1 13h10l1-13" /><path d="M10 11v5M14 11v5" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18 6a8.5 8.5 0 0 1 0 12" /></>,
    "volume-off": <><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="m17 9 4 4M21 9l-4 4" /></>,
  };

  return <svg {...shared}>{paths[name]}</svg>;
}

function Star({ filled = true, className = "" }: { filled?: boolean; className?: string }) {
  return (
    <svg className={`star ${filled ? "star-filled" : "star-empty"} ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2.7 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-2.9L6.4 20l1.1-6.3-4.6-4.4 6.3-.9Z" />
    </svg>
  );
}

function BubbleField() {
  return (
    <div className="bubble-field" aria-hidden="true">
      {Array.from({ length: 14 }, (_, index) => (
        <i
          key={index}
          style={{
            "--i": index,
            "--bubble-left": `${4 + index * 7.1}%`,
            "--bubble-size": `${9 + (index % 5) * 5}px`,
            "--bubble-duration": `${7 + (index % 4) * 1.4}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function RoundButton({
  icon,
  label,
  onClick,
  className = "",
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button className={`round-button ${className}`} onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} />
    </button>
  );
}

function WoodTitle({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`wood-title ${compact ? "wood-title-compact" : ""}`}>
      <span className="wood-nail wood-nail-left" />
      <span>{children}</span>
      <span className="wood-nail wood-nail-right" />
    </div>
  );
}

function LevelCreature({ level }: { level: number }) {
  return (
    <div className={`level-creature creature-${level}`} aria-hidden="true">
      <span className="creature-fin creature-fin-left" />
      <span className="creature-fin creature-fin-right" />
      <span className="creature-face">
        <i className="eye eye-left" />
        <i className="eye eye-right" />
        <i className="smile" />
      </span>
      <b>{level}</b>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [modal, setModal] = useState<Modal>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [progress, setProgress] = useState<LevelProgress>(loadProgress);
  const [level, setLevel] = useState(1);
  const [questions, setQuestions] = useState<Question[]>(() => createQuestions(1));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [resultStars, setResultStars] = useState(0);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem("pengurangan-progress", JSON.stringify(progress));
  }, [progress]);

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
  }, []);

  const playTone = (kind: "tap" | "correct" | "wrong" | "win" = "tap") => {
    if (!soundOn) return;
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const notes = kind === "win" ? [523, 659, 784] : [kind === "correct" ? 660 : kind === "wrong" ? 190 : 420];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "wrong" ? "sawtooth" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + index * 0.1 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.1 + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + index * 0.1);
      oscillator.stop(context.currentTime + index * 0.1 + 0.18);
    });
    window.setTimeout(() => void context.close(), 650);
  };

  const startLevel = (nextLevel: number) => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    playTone("tap");
    setLevel(nextLevel);
    setQuestions(createQuestions(nextLevel));
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setCorrectCount(0);
    setModal(null);
    setScreen("game");
  };

  const finishLevel = (finalCorrect: number, finalScore: number) => {
    const stars = getStars(finalCorrect);
    setResultStars(stars);
    setProgress((current) => {
      const old = current[level] || { best: 0, stars: 0 };
      return {
        ...current,
        [level]: { best: Math.max(old.best, finalScore), stars: Math.max(old.stars, stars) },
      };
    });
    setScreen("result");
    playTone("win");
  };

  const answerQuestion = (answer: number) => {
    if (selectedAnswer !== null) return;
    const question = questions[questionIndex];
    const isCorrect = answer === question.answer;
    const nextCorrect = correctCount + (isCorrect ? 1 : 0);
    const nextScore = score + (isCorrect ? 10 : 0);
    setSelectedAnswer(answer);
    setCorrectCount(nextCorrect);
    setScore(nextScore);
    playTone(isCorrect ? "correct" : "wrong");

    advanceTimer.current = window.setTimeout(() => {
      if (questionIndex === questions.length - 1) {
        finishLevel(nextCorrect, nextScore);
      } else {
        setQuestionIndex((current) => current + 1);
        setSelectedAnswer(null);
      }
    }, 1050);
  };

  const clearProgress = () => {
    setProgress({});
    localStorage.removeItem("pengurangan-progress");
    playTone("tap");
  };

  const totalStars = Object.values(progress).reduce((sum, item) => sum + item.stars, 0);
  const totalBest = Object.values(progress).reduce((sum, item) => sum + item.best, 0);
  const currentQuestion = questions[questionIndex];

  return (
    <main className={`game-app screen-${screen}`}>
      <div className="ocean-backdrop" />
      <div className="water-light" aria-hidden="true" />
      <BubbleField />

      {screen === "home" && (
        <section className="home-screen screen-enter" aria-label="Menu utama">
          <div className="corner-control top-right">
            <RoundButton
              icon={soundOn ? "volume" : "volume-off"}
              label={soundOn ? "Matikan suara" : "Nyalakan suara"}
              onClick={() => setSoundOn((value) => !value)}
            />
          </div>

          <div className="home-content">
            <div className="brand-logo" aria-label="Petualangan Pengurangan 1 sampai 100">
              <span className="brand-small">PETUALANGAN</span>
              <div className="brand-plank">
                <span className="brand-main">PENGURANGAN</span>
              </div>
              <span className="brand-range">1 - 100</span>
              <Star className="logo-star logo-star-left" />
              <Star className="logo-star logo-star-right" />
            </div>
            <p className="home-credit">created by: widodo guru sd</p>
            <p className="home-subtitle">Ayo, selesaikan soal pengurangan<br />dan kumpulkan bintang!</p>
            <button className="primary-play" onClick={() => { playTone("tap"); setScreen("levels"); }}>
              <span className="play-disc"><Icon name="play" size={30} /></span>
              <span>Mulai</span>
            </button>
          </div>

          <nav className="home-nav" aria-label="Menu tambahan">
            <button onClick={() => { playTone("tap"); setModal("how"); }}>
              <span className="nav-icon nav-icon-purple"><Icon name="help" size={27} /></span>
              <span>Cara Bermain</span>
            </button>
            <button onClick={() => { playTone("tap"); setModal("settings"); }}>
              <span className="nav-icon nav-icon-green"><Icon name="settings" size={27} /></span>
              <span>Pengaturan</span>
            </button>
            <button onClick={() => { playTone("tap"); setModal("profile"); }}>
              <span className="nav-icon nav-icon-pink"><Icon name="user" size={27} /></span>
              <span>Profil</span>
            </button>
          </nav>
        </section>
      )}

      {screen === "levels" && (
        <section className="levels-screen screen-enter" aria-label="Pilih level">
          <div className="corner-control top-left">
            <RoundButton icon="arrow-left" label="Kembali" onClick={() => { playTone("tap"); setScreen("home"); }} />
          </div>
          <div className="corner-control top-right">
            <RoundButton
              icon={soundOn ? "volume" : "volume-off"}
              label={soundOn ? "Matikan suara" : "Nyalakan suara"}
              onClick={() => setSoundOn((value) => !value)}
            />
          </div>

          <div className="levels-heading">
            <div className="blue-ribbon"><span>Pilih Level</span></div>
            <p>Pilih petualanganmu dan kumpulkan 3 bintang.</p>
          </div>

          <div className="level-grid">
            {LEVELS.map((item) => {
              const saved = progress[item.level] || { best: 0, stars: 0 };
              return (
                <button
                  key={item.level}
                  className={`level-card level-${item.color}`}
                  onClick={() => startLevel(item.level)}
                  aria-label={`Level ${item.level}, angka ${item.range}, ${saved.stars} bintang`}
                >
                  <LevelCreature level={item.level} />
                  <div className="level-stars">
                    {[0, 1, 2].map((star) => <Star key={star} filled={star < saved.stars} />)}
                  </div>
                  <strong>{item.range}</strong>
                  <small>{saved.best ? `Skor terbaik ${saved.best}` : "Belum dimainkan"}</small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {screen === "game" && currentQuestion && (
        <section className="play-screen screen-enter" aria-label={`Permainan level ${level}`}>
          <header className="game-header">
            <div className="score-box">
              <Star />
              <span><small>Skor</small><strong>{score}</strong></span>
            </div>
            <div className="level-progress">
              <strong>Level {level}</strong>
              <div className="progress-track">
                <span style={{ width: `${((questionIndex + (selectedAnswer !== null ? 1 : 0)) / 10) * 100}%` }} />
                <Star />
              </div>
            </div>
            <RoundButton icon="pause" label="Jeda permainan" onClick={() => { playTone("tap"); setModal("pause"); }} />
          </header>

          <div className="question-area">
            <WoodTitle>
              <span className="question-text">{currentQuestion.minuend} <i>-</i> {currentQuestion.subtrahend} <i>=</i> ?</span>
            </WoodTitle>
            <p className="question-prompt">Pilih jawaban yang benar</p>

            <div className="answer-grid">
              {currentQuestion.options.map((option, index) => {
                const revealed = selectedAnswer !== null;
                const isCorrect = option === currentQuestion.answer;
                const isSelected = option === selectedAnswer;
                const stateClass = revealed && isCorrect ? "answer-correct" : revealed && isSelected ? "answer-wrong" : "";
                return (
                  <button
                    key={option}
                    className={`answer-button answer-${ANSWER_COLORS[index]} ${stateClass}`}
                    onClick={() => answerQuestion(option)}
                    disabled={revealed}
                    aria-label={`Jawaban ${option}`}
                  >
                    <span>{option}</span>
                    {revealed && isCorrect && <i className="answer-mark"><Icon name="check" size={23} /></i>}
                    {revealed && isSelected && !isCorrect && <i className="answer-mark"><Icon name="close" size={23} /></i>}
                  </button>
                );
              })}
            </div>

            <div className={`answer-feedback ${selectedAnswer === null ? "feedback-hidden" : selectedAnswer === currentQuestion.answer ? "feedback-correct" : "feedback-wrong"}`} aria-live="polite">
              {selectedAnswer === null ? "Pilih jawaban" : selectedAnswer === currentQuestion.answer ? "Benar! Kamu hebat!" : `Hampir! Jawabannya ${currentQuestion.answer}`}
            </div>
          </div>

          <footer className="game-footer">
            <div className="remaining-box"><small>Soal</small><strong>{questionIndex + 1} / 10</strong></div>
            <div className="earned-stars" aria-label={`${getStars(correctCount)} bintang sementara`}>
              {[0, 1, 2].map((star) => <Star key={star} filled={star < getStars(correctCount)} />)}
            </div>
          </footer>
        </section>
      )}

      {screen === "result" && (
        <section className="result-screen screen-enter" aria-label="Hasil level">
          <div className="confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <i
                key={index}
                style={{
                  "--i": index,
                  "--confetti-hue": `${index * 38}deg`,
                  "--confetti-left": `${4 + index * 5.3}%`,
                  "--confetti-duration": `${3.5 + (index % 4) * 0.6}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="result-content">
            <h1>{resultStars > 0 ? "Hebat!" : "Ayo Coba Lagi!"}</h1>
            <p>{resultStars > 0 ? "Kamu berhasil menyelesaikan" : "Latihan membuatmu makin pintar"}</p>
            <div className="result-ribbon">Level {level}</div>
            <div className="big-star-wrap">
              <Star filled={resultStars > 0} />
              <span>{correctCount}/10</span>
            </div>
            <div className="result-stars" aria-label={`Mendapat ${resultStars} bintang`}>
              {[0, 1, 2].map((star) => <Star key={star} filled={star < resultStars} />)}
            </div>
            <div className="final-score"><small>Skor Akhir</small><strong>{score}</strong></div>
            <div className="result-actions">
              <button onClick={() => { playTone("tap"); setScreen("home"); }}>
                <span className="action-icon action-home"><Icon name="home" /></span>
                <b>Menu Utama</b>
              </button>
              <button onClick={() => startLevel(level)}>
                <span className="action-icon action-replay"><Icon name="replay" /></span>
                <b>Main Lagi</b>
              </button>
              <button onClick={() => level < 5 ? startLevel(level + 1) : setScreen("levels")}>
                <span className="action-icon action-next"><Icon name="next" /></span>
                <b>{level < 5 ? "Level Berikutnya" : "Pilih Level"}</b>
              </button>
            </div>
          </div>
        </section>
      )}

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Tutup"><Icon name="close" size={22} /></button>

            {modal === "how" && (
              <>
                <WoodTitle compact><span id="modal-title">Cara Bermain</span></WoodTitle>
                <div className="how-steps">
                  <div><span>1</span><p>Pilih satu dari 5 level pengurangan.</p></div>
                  <div><span>2</span><p>Hitung soal, lalu pilih 1 dari 3 jawaban.</p></div>
                  <div><span>3</span><p>Jawab benar sebanyak mungkin untuk meraih 3 bintang.</p></div>
                </div>
                <button className="modal-primary" onClick={() => setModal(null)}>Siap Bermain</button>
              </>
            )}

            {modal === "settings" && (
              <>
                <WoodTitle compact><span id="modal-title">Pengaturan</span></WoodTitle>
                <div className="setting-row">
                  <div><Icon name={soundOn ? "volume" : "volume-off"} /><span><strong>Efek Suara</strong><small>Suara jawaban dan tombol</small></span></div>
                  <button className={`toggle ${soundOn ? "toggle-on" : ""}`} onClick={() => setSoundOn((value) => !value)} aria-label="Ubah pengaturan suara"><i /></button>
                </div>
                <button className="danger-button" onClick={clearProgress}><Icon name="trash" size={20} /> Hapus semua progres</button>
              </>
            )}

            {modal === "profile" && (
              <>
                <WoodTitle compact><span id="modal-title">Profil Penjelajah</span></WoodTitle>
                <div className="profile-avatar"><Icon name="user" size={52} /></div>
                <h2>Bintang Laut Pintar</h2>
                <p className="profile-copy">Terus berlatih dan taklukkan semua level!</p>
                <div className="profile-stats">
                  <div><Star /><strong>{totalStars}/15</strong><small>Bintang</small></div>
                  <div><Icon name="check" size={30} /><strong>{totalBest}</strong><small>Total skor terbaik</small></div>
                </div>
              </>
            )}

            {modal === "pause" && (
              <>
                <WoodTitle compact><span id="modal-title">Permainan Dijeda</span></WoodTitle>
                <p className="pause-copy">Ambil napas sebentar. Soalmu tetap aman.</p>
                <button className="modal-primary" onClick={() => { playTone("tap"); setModal(null); }}><Icon name="play" size={22} /> Lanjutkan</button>
                <button className="modal-secondary" onClick={() => { setModal(null); setScreen("levels"); }}>Pilih Level Lain</button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default App;