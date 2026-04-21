import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, ExternalLink, Plus, X, Trash2, CheckCircle, 
  Clock, ShieldCheck, AlertCircle, BookOpen, Search, User,
  Sparkles, Loader2
} from 'lucide-react';
import { uploadToDrive } from '../services/googleApi';
import { reviewReport } from '../services/aiService';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from '../components/UserAvatar';

// ── Huy hiệu trạng thái ──────────────────────────────────────────────────────
function StatusBadge({ status, isOwn }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/25">
        <CheckCircle className="w-2.5 h-2.5" /> Đã duyệt
      </span>
    );
  }
  if (isOwn) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
        <Clock className="w-2.5 h-2.5" /> Chờ duyệt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/15 text-gray-400 border border-gray-700">
      <Clock className="w-2.5 h-2.5" /> Chờ duyệt
    </span>
  );
}

// ── Card tài liệu ─────────────────────────────────────────────────────────────
function ReportCard({ r, getMemberById, isCore, isSuperAdmin, currentUser, approveReport, deleteReport }) {
  const author = getMemberById(r.authorId);
  const isPending = r.status === 'pending';
  const isOwn = r.authorId === currentUser?.id;
  const canModerate = isCore || isSuperAdmin;

  const [aiResult, setAiResult] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAiReview = async () => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    try {
      const res = await reviewReport(r.title, author?.fullName || 'Thành viên');
      setAiResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
      relative p-4 rounded-2xl border flex flex-col gap-3 transition-all
      ${isPending 
        ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40' 
        : 'bg-[#1e1e1e] border-gray-800 hover:border-gray-700'}
    `}>
      {/* Pending overlay hint for owner */}
      {isPending && isOwn && !canModerate && (
        <div className="absolute top-3 right-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        </div>
      )}

      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white leading-tight" title={r.title}>{r.title}</h3>
            <StatusBadge status={r.status} isOwn={isOwn} />
          </div>
          {r.link ? (
            <a href={r.link} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-1.5 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Mở tài liệu
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 mt-1.5">
              <AlertCircle className="w-3 h-3" /> Chưa có link
            </span>
          )}
        </div>

        {/* Action buttons — only Core/Admin */}
        {canModerate && (
          <div className="flex items-center gap-2 shrink-0">
            {isPending && (
              <button
                onClick={handleAiReview}
                disabled={isAiLoading}
                className="flex items-center gap-1 px-2 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors text-[11px] font-bold"
              >
                {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Review
              </button>
            )}
            {isPending && (
              <button
                onClick={() => approveReport(r.id)}
                title="Duyệt tài liệu này"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/25 rounded-lg transition-colors text-[11px] font-bold btn-active"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Duyệt
              </button>
            )}
            <button
              onClick={() => { if (window.confirm('Xóa tài liệu này?')) deleteReport(r.id); }}
              title="Xóa"
              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 rounded-lg transition-colors btn-active"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Footer: author + date */}
      <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-gray-800/60">
        <div className="flex items-center gap-2">
          <UserAvatar user={author} size={20} />
          <span className="text-xs text-gray-400">{author?.fullName || 'Thành viên'}</span>
          {isOwn && <span className="text-[10px] text-blue-400 font-bold">(bạn)</span>}
        </div>
        <span className="text-[10px] text-gray-600">
          {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }) : ''}
        </span>
      </div>

      {/* AI Review Result Overlay/Expansion */}
      <AnimatePresence>
        {aiResult && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 p-3 bg-blue-600/5 border border-blue-500/20 rounded-xl space-y-2 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black text-blue-400 flex items-center gap-1 uppercase tracking-widest">
                <Sparkles className="w-2.5 h-2.5" /> Kết quả AI
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                aiResult.quality === 'excellent' ? 'bg-green-500/20 text-green-400' : 
                aiResult.quality === 'good' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
              }`}>
                {aiResult.qualityLabel}
              </span>
            </div>
            <div className="space-y-1">
              {aiResult.summary?.map((s, i) => (
                <div key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="leading-snug">{s}</span>
                </div>
              ))}
            </div>
            {aiResult.feedback && (
              <div className="text-[10px] text-gray-500 italic mt-1 pt-1 border-t border-gray-800/40">
                Phản hồi: "{aiResult.feedback}"
              </div>
            )}
            <button onClick={() => setAiResult(null)} className="text-[9px] text-gray-600 hover:text-gray-400 font-bold uppercase underline mt-1">Đóng review</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Component chính ────────────────────────────────────────────────────────────
export default function Reports() {
  const { 
    reports = [], currentUser, isCore, isSuperAdmin, 
    addReport, approveReport, deleteReport, getMemberById, requireGoogleAuth,
    toast
  } = useApp();

  const [activeTab, setActiveTab]     = useState('event');
  const [showModal, setShowModal]     = useState(false);
  const [search, setSearch]           = useState('');
  const [viewFilter, setViewFilter]   = useState('all'); // 'all' | 'pending' | 'approved'
  
  const [form, setForm]               = useState({ title: '', link: '', type: 'event' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [err, setErr]                 = useState('');

  const canModerate = isCore || isSuperAdmin;

  // ── Lọc dữ liệu ──────────────────────────────────────────────────────────────
  const { myPending, otherPending, approved, pendingCount } = useMemo(() => {
    const q = search.toLowerCase();
    const list = reports
      .filter(r => r && r.type === activeTab)
      .filter(r => !q || (r.title || '').toLowerCase().includes(q) || (r.link || '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const myPendingList    = [];
    const otherPendingList = [];
    const approvedList     = [];

    list.forEach(r => {
      if (r.status === 'pending') {
        if (r.authorId === currentUser?.id) {
          myPendingList.push(r);    // luôn thấy tài liệu của chính mình
        } else if (canModerate) {
          otherPendingList.push(r); // Core/Admin thấy của người khác
        }
      } else {
        approvedList.push(r);
      }
    });

    return {
      myPending:    myPendingList,
      otherPending: otherPendingList,
      approved:     approvedList,
      pendingCount: myPendingList.length + otherPendingList.length,
    };
  }, [reports, activeTab, search, canModerate, currentUser?.id]);

  // ── Xử lý thêm ───────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.title.trim()) return setErr('Vui lòng nhập tên tài liệu');
    if (!selectedFile && (!form.link.trim() || !form.link.startsWith('http')))
      return setErr('Vui lòng chọn file hoặc nhập link hợp lệ');
    
    setErr('');
    let finalLink = form.link.trim();

    if (selectedFile) {
      setIsUploading(true);
      try {
        let token = await requireGoogleAuth();
        if (!token) { setIsUploading(false); return; }
        try {
          finalLink = await uploadToDrive(token, selectedFile);
        } catch (uploadErr) {
          if (uploadErr.message === 'EXPIRED_TOKEN') {
            const newToken = await requireGoogleAuth(true);
            if (newToken) finalLink = await uploadToDrive(newToken, selectedFile);
            else throw new Error('Phiên Google hết hạn. Vui lòng đăng nhập lại.');
          } else throw uploadErr;
        }
      } catch (error) {
        setIsUploading(false);
        return setErr(error.message || 'Lỗi khi tải file lên Google Drive');
      }
      setIsUploading(false);
    }

    addReport({
      title:    form.title.trim(),
      link:     finalLink,
      type:     form.type || activeTab,
      status:   canModerate ? 'approved' : 'pending',
      authorId: currentUser?.id,
    });

    setShowModal(false);
    setForm({ title: '', link: '', type: activeTab });
    setSelectedFile(null);
  };

  const cardProps = { getMemberById, isCore, isSuperAdmin, currentUser, approveReport, deleteReport };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="h-full flex flex-col bg-[#121212] overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="px-6 py-5 border-b border-gray-800/60 shrink-0 bg-[#1a1a1a]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-500" />
              Báo cáo &amp; Tài liệu
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Chia sẻ tài liệu nghiên cứu và tổng kết sự kiện của nhóm
            </p>
          </div>
          <button
            onClick={() => { setForm({ title: '', link: '', type: activeTab }); setSelectedFile(null); setErr(''); setShowModal(true); }}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all shrink-0 btn-active shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" /> Thêm tài liệu
          </button>
        </div>
      </div>

      {/* ── Tabs + Search + Filter ── */}
      <div className="px-6 py-3 border-b border-gray-800/60 shrink-0 bg-[#1a1a1a]/60 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex bg-[#252525] p-1 rounded-xl">
          {[
            { id: 'event',    label: 'Tóm tắt sự kiện' },
            { id: 'research', label: 'Báo cáo nghiên cứu' },
            { id: 'book',     label: 'Sách' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold tab-transition ${
                activeTab === t.id ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* View filter (Core/Admin only) */}
          {canModerate && pendingCount > 0 && (
            <div className="flex bg-[#252525] p-0.5 rounded-lg">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'pending', label: `Chờ duyệt (${pendingCount})` },
                { id: 'approved', label: 'Đã duyệt' },
              ].map(f => (
                <button key={f.id} onClick={() => setViewFilter(f.id)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                    viewFilter === f.id 
                      ? f.id === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-600/20 text-blue-400' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 bg-[#1e1e1e] border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 fade-in-up">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* ── Phần: Tài liệu chờ duyệt của TÔI (member thấy) ── */}
          {myPending.length > 0 && !canModerate && viewFilter !== 'approved' && (
            <section>
              <div className="flex items-center gap-2 mb-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-300">
                    {myPending.length} tài liệu đang chờ phê duyệt
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Core Team sẽ kiểm tra và phê duyệt sớm. Tài liệu chưa hiển thị công khai cho đến khi được duyệt.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myPending.map(r => <ReportCard key={r.id} r={r} {...cardProps} />)}
              </div>
            </section>
          )}

          {/* ── Phần: Chờ duyệt — Core/Admin thấy của người khác ── */}
          {canModerate && (viewFilter === 'all' || viewFilter === 'pending') && (
            (myPending.length > 0 || otherPending.length > 0) && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">
                        Chờ phê duyệt
                        <span className="ml-2 text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                          {myPending.length + otherPending.length}
                        </span>
                      </h2>
                      {canModerate && (
                        <p className="text-[10px] text-gray-500 mt-0.5">Nhấn "Duyệt" để phê duyệt và hiển thị tài liệu</p>
                      )}
                    </div>
                  </div>
                  {canModerate && otherPending.length > 0 && (
                    <button
                      onClick={() => otherPending.forEach(r => approveReport(r.id))}
                      className="px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg text-xs font-bold transition-all btn-active border border-green-500/20"
                    >
                      <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                      Duyệt tất cả
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[...myPending, ...otherPending].map(r => <ReportCard key={r.id} r={r} {...cardProps} />)}
                </div>
              </section>
            )
          )}

          {/* ── Phần: Đã phê duyệt ── */}
          {(viewFilter === 'all' || viewFilter === 'approved') && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <h2 className="text-sm font-bold text-white">
                  Đã phê duyệt
                  <span className="ml-2 text-xs font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                    {approved.length}
                  </span>
                </h2>
              </div>

              {approved.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 border border-dashed border-gray-800 rounded-2xl"
                >
                  <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm font-medium">Chưa có tài liệu nào</p>
                  <p className="text-gray-600 text-xs mt-1">Hãy là người đầu tiên chia sẻ!</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {approved.map((r) => (
                      <ReportCard key={r.id} r={r} {...cardProps} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          )}

        </div>
      </div>

      {/* ── Modal Thêm tài liệu ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" 
            onClick={() => setShowModal(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#1a1a1a] border border-gray-800 rounded-2xl shadow-2xl flex flex-col" 
              onClick={e => e.stopPropagation()}
            >
              
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" /> Thêm tài liệu mới
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white p-1 transition-colors btn-active">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {err && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{err}</p>
                  </div>
                )}

                {!canModerate && (
                  <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Tài liệu sẽ vào trạng thái <strong className="text-amber-400">Chờ duyệt</strong>. Core Team sẽ kiểm tra và phê duyệt trước khi hiển thị công khai.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên tài liệu <span className="text-red-500">*</span></label>
                  <input
                    type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="VD: Báo cáo seminar vật liệu 2D..."
                    className="w-full h-10 px-4 bg-[#121212] border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tài liệu đính kèm <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type="file" disabled={isUploading}
                      onChange={e => { setSelectedFile(e.target.files[0]); setForm({...form, link: ''}); }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`w-full h-10 px-4 flex items-center border rounded-xl text-sm transition-all ${
                      selectedFile ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-[#121212] border-gray-700 text-gray-500'
                    }`}>
                      <span className="truncate">{selectedFile ? selectedFile.name : 'Nhấn để chọn file...'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 my-1">
                    <div className="h-px bg-gray-800 flex-1" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Hoặc dán link</span>
                    <div className="h-px bg-gray-800 flex-1" />
                  </div>

                  <input
                    type="url" value={form.link} disabled={isUploading}
                    onChange={e => { setForm({...form, link: e.target.value}); setSelectedFile(null); }}
                    placeholder="https://docs.google.com/..."
                    className="w-full h-10 px-4 bg-[#121212] border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phân loại</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'event',    label: 'Sự kiện' },
                      { id: 'research', label: 'Nghiên cứu' },
                      { id: 'book',     label: 'Sách' },
                    ].map(t => (
                      <button key={t.id} onClick={() => setForm({...form, type: t.id})}
                        className={`h-10 rounded-xl text-sm font-semibold transition-all border btn-active ${
                          form.type === t.id
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                            : 'bg-[#121212] border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-gray-800 bg-[#121212] rounded-b-2xl flex justify-end gap-3">
                <button onClick={() => setShowModal(false)}
                  className="px-5 h-10 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors btn-active">
                  Hủy
                </button>
                <button onClick={handleAdd} disabled={isUploading}
                  className="px-6 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 btn-active shadow-lg shadow-blue-600/20">
                  {isUploading ? <><Clock className="w-4 h-4 animate-spin" /> Đang tải lên...</> : 'Đăng tài liệu'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
