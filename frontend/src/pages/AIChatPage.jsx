import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { projectService } from '../api/projects';
import { aiService } from '../api/ai';
import { extractErrorMessage } from '../utils/errors';

export default function AIChatPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [aiInfo, setAiInfo] = useState({ ai_name: 'IssueDesk AI', provider: 'groq' });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    projectService.getAll()
      .then((data) => {
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id.toString());
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load projects.');
      })
      .finally(() => setProjectsLoading(false));

    aiService.getInfo()
      .then((info) => {
        setAiInfo(info);
      })
      .catch((err) => {
        console.error('Failed to fetch AI info:', err);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e, textOverride = '') => {
    if (e) e.preventDefault();
    const query = (textOverride || input).trim();
    if (!query || !selectedProjectId) return;

    if (!textOverride) setInput('');
    setError('');

    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await aiService.chat(parseInt(selectedProjectId), query, historyPayload);
      setMessages((prev) => [...prev, { role: 'model', content: res.response }]);
    } catch (err) {
      const errMsg = extractErrorMessage(err, 'Failed to get response from AI');
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    handleSend(null, question);
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
  };

  const renderMessageContent = (text) => {
    return text.split('\n').map((line, i) => {
      let processedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      
      const parts = [];
      let lastIdx = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIdx) {
          parts.push(line.substring(lastIdx, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-semibold text-indigo-900 bg-indigo-50/70 px-1 py-0.5 rounded border border-indigo-100/50">
            {match[1]}
          </strong>
        );
        lastIdx = boldRegex.lastIndex;
      }
      
      if (lastIdx < line.length) {
        parts.push(line.substring(lastIdx));
      }

      const content = parts.length > 0 ? parts : processedLine;

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listText = line.trim().substring(2);
        return (
          <li key={i} className="list-disc ml-6 my-1 text-slate-700">
            {parts.length > 0 ? parts : listText}
          </li>
        );
      }

      if (line.trim().startsWith('### ')) {
        return (
          <h4 key={i} className="text-xs font-bold text-slate-800 mt-3 mb-1 uppercase tracking-wider">
            {line.trim().substring(4)}
          </h4>
        );
      }
      if (line.trim().startsWith('## ') || line.trim().startsWith('# ')) {
        const headerText = line.trim().replace(/^#+\s+/, '');
        return (
          <h3 key={i} className="text-sm font-bold text-indigo-950 mt-4 mb-2 border-b border-slate-100 pb-1">
            {headerText}
          </h3>
        );
      }

      return (
        <p key={i} className="my-1.5 text-slate-700 leading-relaxed min-h-[0.5rem]">
          {content}
        </p>
      );
    });
  };

  const suggestedQuestions = [
    'Find duplicate bug reports',
    'List all open high-priority issues',
    'Summarize comments and developer discussions',
    'Suggest assignee workload balance',
  ];

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8.5rem)]">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200/80 gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>✨</span> {aiInfo.ai_name}
              </h1>
              <span className="text-[11px] font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                {aiInfo.provider}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Query project issues, comments, workload distribution, and codebase knowledge in real-time.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Workspace:</span>
            {projectsLoading ? (
              <div className="text-xs text-slate-400">Loading workspaces...</div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  clearChat();
                }}
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            )}
            
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-xs text-rose-500 hover:text-rose-700 font-semibold px-3 py-2 hover:bg-rose-50 rounded-xl transition"
              >
                Clear Chat
              </button>
            )}
          </div>
        </div>

        {/* Errors Warning */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs mt-4 font-medium shadow-xs">
            ⚠️ <strong>AI Request Error:</strong> {error}
          </div>
        )}

        {/* Main Chat Display Area */}
        <div className="flex-1 overflow-y-auto py-6 space-y-4 px-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6 animate-fadeIn">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-3xl flex items-center justify-center text-3xl text-white shadow-lg shadow-indigo-500/30">
                ✨
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">What would you like to ask {aiInfo.ai_name}?</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
                  Select a prompt below or ask custom questions regarding your project issues, assignees, and task timelines.
                </p>
              </div>

              {selectedProjectId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-4">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-left p-4 bg-white border border-slate-200/80 rounded-2xl hover:border-indigo-300 hover:shadow-md text-xs text-slate-700 font-semibold transition group"
                    >
                      <span className="text-indigo-600 group-hover:scale-110 inline-block transition mr-1.5">💡</span> {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 sm:gap-4 ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.role !== 'user' && (
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-xs shadow-md shadow-indigo-500/20 shrink-0 font-extrabold select-none">
                      ✨
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-3xl p-4 sm:p-5 text-xs sm:text-sm shadow-xs ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-none font-medium'
                        : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    ) : (
                      <div className="space-y-1">{renderMessageContent(m.content)}</div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-extrabold shrink-0 uppercase select-none shadow-xs">
                      YOU
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 sm:gap-4 justify-start">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-xs shadow-md shrink-0 font-extrabold animate-spin">
                    🌀
                  </div>
                  <div className="bg-white border border-slate-200/80 rounded-3xl rounded-tl-none p-4 max-w-[80%] shadow-xs flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500">{aiInfo.ai_name} is reasoning...</span>
                    <span className="flex space-x-1">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100"></span>
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-200"></span>
                    </span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form Footer */}
        <div className="mt-4 pt-4 border-t border-slate-200/80 max-w-4xl w-full mx-auto">
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || !selectedProjectId}
              placeholder={
                selectedProjectId
                  ? "Ask anything about project tasks, bugs, or assignees..."
                  : "Please select a project first"
              }
              className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !selectedProjectId}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-semibold transition shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Ask AI
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
