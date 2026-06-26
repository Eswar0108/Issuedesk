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
  const [aiInfo, setAiInfo] = useState({ ai_name: 'IssueDesk AI', provider: 'ollama' });
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
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e, textOverride = '') => {
    if (e) e.preventDefault();
    const query = (textOverride || input).trim();
    if (!query || !selectedProjectId) return;

    if (!textOverride) setInput('');
    setError('');

    // Append user message
    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Map message history to what the backend expects: [{role: 'user'/'model', content: '...'}]
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await aiService.chat(parseInt(selectedProjectId), query, historyPayload);
      
      // Append assistant response
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
          <strong key={match.index} className="font-semibold text-indigo-900 bg-indigo-50/50 px-1 rounded">
            {match[1]}
          </strong>
        );
        lastIdx = boldRegex.lastIndex;
      }
      
      if (lastIdx < line.length) {
        parts.push(line.substring(lastIdx));
      }

      const content = parts.length > 0 ? parts : processedLine;

      // Unordered lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listText = line.trim().substring(2);
        return (
          <li key={i} className="list-disc ml-6 my-1 text-gray-700">
            {parts.length > 0 ? parts : listText}
          </li>
        );
      }

      // Headers (e.g. ### Header or ## Header)
      if (line.trim().startsWith('### ')) {
        return (
          <h4 key={i} className="text-sm font-bold text-gray-800 mt-3 mb-1 uppercase tracking-wider">
            {line.trim().substring(4)}
          </h4>
        );
      }
      if (line.trim().startsWith('## ') || line.trim().startsWith('# ')) {
        const headerText = line.trim().replace(/^#+\s+/, '');
        return (
          <h3 key={i} className="text-base font-bold text-indigo-950 mt-4 mb-2 border-b pb-1">
            {headerText}
          </h3>
        );
      }

      return (
        <p key={i} className="my-1.5 text-gray-700 leading-relaxed min-h-[0.5rem]">
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
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100 gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center gap-2">
              ✨ {aiInfo.ai_name}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Analyze issues, search comments, and query your project codebase using {
                aiInfo.provider === 'ollama' ? 'local free Ollama' :
                aiInfo.provider === 'openai' ? 'OpenAI GPT' : 'Google Gemini'
              }.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">Project context:</span>
            {projectsLoading ? (
              <div className="text-sm text-gray-400">Loading projects...</div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  clearChat();
                }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1.5 hover:bg-red-50 rounded-lg transition"
              >
                Clear Chat
              </button>
            )}
          </div>
        </div>

        {/* Errors / Configurations warning */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-3 flex flex-col gap-1 whitespace-pre-line shadow-sm">
            <span className="font-semibold">AI Request Error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Main Chat Display Area */}
        <div className="flex-1 overflow-y-auto py-6 space-y-4 px-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner animate-pulse">
                🔮
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">What would you like to know about this project?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {aiInfo.ai_name} will analyze all issues, comments, tasks, assignees, and progress to answer your queries.
                </p>
              </div>

              {selectedProjectId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-4">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-left p-3.5 border border-gray-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 text-sm text-gray-700 transition hover:shadow-sm"
                    >
                      💡 {q}
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
                  className={`flex gap-4 ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.role !== 'user' && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center text-base shadow-sm shrink-0 font-bold select-none">
                      AI
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    ) : (
                      <div className="space-y-1">{renderMessageContent(m.content)}</div>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0 uppercase select-none">
                      ME
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center text-base shadow-sm shrink-0 font-bold select-none animate-spin">
                    🌀
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 max-w-[80%] shadow-sm flex items-center gap-3">
                    <span className="text-sm text-gray-500">Antigravity is analyzing project context...</span>
                    <span className="flex space-x-1">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></span>
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></span>
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200"></span>
                    </span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100 max-w-4xl w-full mx-auto">
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || !selectedProjectId}
              placeholder={
                selectedProjectId
                  ? "Ask about bugs, workload, comments..."
                  : "Please create a project first"
              }
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !selectedProjectId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Ask AI
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
