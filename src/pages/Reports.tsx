// @ts-nocheck
import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, ExternalLink, Plus, X, Trash2, CheckCircle, 
  Clock, ShieldCheck, AlertCircle, BookOpen, Search, User,
  Sparkles, Loader2, Pencil, Tag, RefreshCw, Layers
} from 'lucide-react';
import { uploadToDrive } from '../services/googleApi';
import { classifyReport, groupReportsByTopic } from '../services/aiService';
import { useReports } from '../hooks/useDomainQueries';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from '../components/UserAvatar';
import { safeDocumentUrl } from '../services/reportClassification.js';

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
function ReportCard({ r, getMemberById, isCore, isSuperAdmin, currentUser, approveReport, updateReport, deleteReport, onEdit }) {
  const { toast } = useApp();
  const [isApplying, setIsApplying] = useState(false);
  const author = getMemberById(r.authorId);
  const isPending = r.status === 'pending';
  const isOwn = r.authorId === currentUser?.id;
  const canModerate = isCore || isSuperAdmin;
  const canEdit = isOwn || canModerate;
  const canDelete = canModerate || (isOwn && isPending);

  const [aiClassifyResult, setAiClassifyResult] = useState(null);
  const [isAiClassifyLoading, setIsAiClassifyLoading] = useState(false);

  const handleAiClassify = async () => {
    if (isAiClassifyLoading) return;
    setIsAiClassifyLoading(true);
    try {
      const res = await classifyReport(r.title, r.description || '');
      setAiClassifyResult(res);
    } catch (err) {
      toast(err.message || 'Không phân loại được tài liệu.', 'error');
    } finally {
      setIsAiClassifyLoading(false);
    }
  };

  const handleApplyClassification = async (targetType, tags) => {
    if (!updateReport || isApplying) return;
    setIsApplying(true);
    const saved = await updateReport(r.id, {
      type: targetType, 
      tags: [...new Set([...(r.tags || []), ...(tags || [])])],
      classification: { ...aiClassifyResult, classifiedAt: new Date().toISOString() },
    });
    setIsApplying(false);
    if (saved) setAiClassifyResult(null);
  };

  const typeLabels = {
    event: 'Tóm tắt sự kiện',
    research: 'Báo cáo nghiên cứu',
    book: 'Sách',
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
            <h3 className="text-sm font-bold text-white leading-tight break-words" title={r.title}>{r.title}</h3>
            <StatusBadge status={r.status} isOwn={isOwn} />
          </div>

          {/* Tags */}
          {r.tags && r.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {r.tags.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {safeDocumentUrl(r.link) ? (
            <a href={safeDocumentUrl(r.link)} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Mở tài liệu
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 mt-2">
              <AlertCircle className="w-3 h-3" /> Chưa có link
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {/* AI Phân loại button */}
          <button
            onClick={handleAiClassify}
            disabled={isAiClassifyLoading}
            title="Dùng AI phân tích & gợi ý danh mục"
            className="flex items-center gap-1 px-2 py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors text-[11px] font-bold btn-active border border-purple-500/20"
          >
            {isAiClassifyLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Phân loại AI
          </button>

          {/* Chỉnh sửa tên báo cáo */}
          {canEdit && (
            <button
              onClick={() => onEdit(r)}
              title="Chỉnh sửa tên và thông tin tài liệu"
              className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors btn-active border border-blue-500/20"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Approve button — only Core/Admin */}
          {canModerate && isPending && (
            <button
              onClick={() => approveReport(r.id)}
              title="Duyệt tài liệu này"
              className="flex items-center gap-1 px-2 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/25 rounded-lg transition-colors text-[11px] font-bold btn-active"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Duyệt
            </button>
          )}

          {/* Delete button */}
          {canDelete && (
            <button
              onClick={() => { if (window.confirm('Xóa tài liệu này?')) deleteReport(r.id); }}
              title="Xóa"
              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 rounded-lg transition-colors btn-active"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
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

      {/* AI Classification Result Box */}
      <AnimatePresence>
        {aiClassifyResult && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 p-3 bg-purple-600/10 border border-purple-500/30 rounded-xl space-y-2 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black text-purple-400 flex items-center gap-1 uppercase tracking-widest">
                <Sparkles className="w-3 h-3 text-purple-400" /> Kết quả AI Phân loại
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                {aiClassifyResult.confidence}% tin cậy
              </span>
            </div>

            <div className="text-xs text-gray-200">
              <span className="text-gray-400">Danh mục đề xuất: </span>
              <strong className="text-purple-300 underline font-bold">{aiClassifyResult.typeName}</strong>
              {aiClassifyResult.type === r.type ? (
                <span className="ml-2 text-green-400 text-[10px] font-bold">✓ Đúng danh mục hiện tại</span>
              ) : (
                <span className="ml-2 text-amber-400 text-[10px] font-bold">(Khác mục hiện tại: {typeLabels[r.type] || r.type})</span>
              )}
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed italic">
              "{aiClassifyResult.reason}"
            </p>

            {aiClassifyResult.tags && aiClassifyResult.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Tags:</span>
                {aiClassifyResult.tags.map((t, idx) => (
                  <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-[#222] text-purple-300 rounded border border-purple-500/20 font-medium">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-purple-500/20 mt-1">
              {canEdit ? (
                <button
                  disabled={isApplying}
                  onClick={() => handleApplyClassification(aiClassifyResult.type, aiClassifyResult.tags)}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold transition-all shadow-md"
                >
                  {isApplying ? 'Đang lưu…' : `Áp dụng: ${aiClassifyResult.typeName}`}
                </button>
              ) : (
                <span />
              )}
              <button 
                onClick={() => setAiClassifyResult(null)} 
                className="text-[10px] text-gray-500 hover:text-gray-300 font-bold uppercase underline"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

// ── Component chính ────────────────────────────────────────────────────────────
export default function Reports() {
  const { 
    currentUser, isCore, isSuperAdmin, 
    addReport, approveReport, updateReport, deleteReport, getMemberById, requireGoogleAuth,
    toast
  } = useApp();
  const { data: reports = [] } = useReports();

  const [activeTab, setActiveTab]         = useState('event');
  const [showModal, setShowModal]         = useState(false);
  const [search, setSearch]               = useState('');
  const [viewFilter, setViewFilter]       = useState('all'); // 'all' | 'pending' | 'approved'
  
  // Add modal state
  const [form, setForm]                   = useState({ title: '', link: '', type: 'event', tags: [] });
  const [selectedFile, setSelectedFile]   = useState(null);
  const [isUploading, setIsUploading]     = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [err, setErr]                     = useState('');
  const [isAddClassifying, setIsAddClassifying] = useState(false);
  const [addAiSuggestion, setAddAiSuggestion]   = useState(null);

  // Edit modal state
  const [editingReport, setEditingReport]       = useState(null);
  const [editForm, setEditForm]                 = useState({ title: '', link: '', type: 'event', tags: [] });
  const [editErr, setEditErr]                   = useState('');
  const [isEditClassifying, setIsEditClassifying] = useState(false);
  const [editAiSuggestion, setEditAiSuggestion] = useState(null);
  const latestForm = useRef(form);
  const latestEditForm = useRef(editForm);
  latestForm.current = form;
  latestEditForm.current = editForm;
  useEffect(() => { setAddAiSuggestion(null); }, [form.title, form.description]);
  useEffect(() => { setEditAiSuggestion(null); }, [editForm.title, editForm.description]);

  // AI Thematic Clustering state (Gom nhóm theo chủ đề)
  const [isGroupedByTopic, setIsGroupedByTopic]         = useState(false);
  const [isClustering, setIsClustering]                 = useState(false);
  const [topicClusters, setTopicClusters]               = useState([]);
  const [selectedTopicFilter, setSelectedTopicFilter]   = useState('all');

  const canModerate = isCore || isSuperAdmin;

  // Tự động tắt gom nhóm chủ đề khi đổi tab môn/loại tài liệu
  useEffect(() => {
    setIsGroupedByTopic(false);
    setTopicClusters([]);
    setSelectedTopicFilter('all');
  }, [activeTab, reports, search]);

  // ── Lọc dữ liệu ──────────────────────────────────────────────────────────────
  const { myPending, otherPending, approved, pendingCount } = useMemo(() => {
    const q = search.toLowerCase();
    const list = reports
      .filter(r => r && r.type === activeTab)
      .filter(r => !q || (r.title || '').toLowerCase().includes(q) || (r.link || '').toLowerCase().includes(q) || (r.tags || []).some(t => t.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

  // ── AI Phân loại cho Modal Thêm mới ──────────────────────────────────────────
  const handleAiClassifyAdd = async () => {
    if (!form.title.trim() || isAddClassifying) return;
    setIsAddClassifying(true);
    try {
      const res = await classifyReport(form.title, form.description || selectedFile?.name || '');
      if (latestForm.current.title !== form.title || latestForm.current.description !== form.description) return;
      setAddAiSuggestion(res);
      setForm(f => ({
        ...f,
        type: res.type,
        tags: res.tags || []
      }));
    } catch (error) {
      setErr(error.message);
    } finally {
      setIsAddClassifying(false);
    }
  };

  // ── Xử lý thêm ───────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (isSaving || isUploading || isAddClassifying) return;
    if (!form.title.trim()) return setErr('Vui lòng nhập tên tài liệu');
    if (!selectedFile && !safeDocumentUrl(form.link.trim()))
      return setErr('Vui lòng chọn file hoặc nhập link hợp lệ');
    
    setErr('');
    let finalLink = form.link.trim();

    if (selectedFile) {
      setIsUploading(true);
      try {
        let token = await requireGoogleAuth();
        if (!token) { setIsUploading(false); return; }
        try {
          finalLink = await uploadToDrive(token, selectedFile, '2X18_Reports', message => toast(message, 'info'));
        } catch (uploadErr) {
          if (uploadErr.message === 'EXPIRED_TOKEN') {
            const newToken = await requireGoogleAuth(true);
            if (newToken) finalLink = await uploadToDrive(newToken, selectedFile, '2X18_Reports', message => toast(message, 'info'));
            else throw new Error('Phiên Google hết hạn. Vui lòng đăng nhập lại.');
          } else throw uploadErr;
        }
      } catch (error) {
        setIsUploading(false);
        return setErr(error.message || 'Lỗi khi tải file lên Google Drive');
      }
      setIsUploading(false);
    }

    setIsSaving(true);
    const saved = await addReport({
      title:    form.title.trim(),
      link:     finalLink,
      type:     form.type || activeTab,
      tags:     form.tags || (addAiSuggestion?.tags || []),
      status:   canModerate ? 'approved' : 'pending',
      authorId: currentUser?.id,
      description: form.description || '',
      ...(addAiSuggestion ? { classification: { ...addAiSuggestion, classifiedAt: new Date().toISOString() } } : {}),
    });
    setIsSaving(false);
    if (!saved) { setForm(f => ({ ...f, link: finalLink })); setSelectedFile(null); return setErr('Chưa lưu được báo cáo. Nội dung được giữ lại để thử lại.'); }

    setShowModal(false);
    setForm({ title: '', link: '', type: activeTab, tags: [] });
    setSelectedFile(null);
    setAddAiSuggestion(null);
  };

  // ── Xử lý Chỉnh sửa Báo cáo ──────────────────────────────────────────────────
  const handleOpenEdit = (report) => {
    setEditingReport(report);
    setEditForm({
      title: report.title || '',
      link: report.link || '',
      type: report.type || activeTab,
      tags: Array.isArray(report.tags) ? [...report.tags] : [],
      description: report.description || '',
    });
    setEditErr('');
    setEditAiSuggestion(null);
  };

  const handleSaveEdit = async () => {
    if (isSaving || isEditClassifying) return;
    if (!editForm.title.trim()) {
      return setEditErr('Vui lòng nhập tên tài liệu');
    }
    setEditErr('');
    if (editForm.link.trim() && !safeDocumentUrl(editForm.link.trim())) return setEditErr('Liên kết phải dùng http hoặc https.');
    setIsSaving(true);
    const saved = await updateReport(editingReport.id, {
      title: editForm.title.trim(),
      link: editForm.link.trim(),
      type: editForm.type,
      tags: editForm.tags || [],
      description: editForm.description || '',
      ...(editAiSuggestion ? { classification: { ...editAiSuggestion, classifiedAt: new Date().toISOString() } } : {}),
    });
    setIsSaving(false);
    if (saved) setEditingReport(null);
    else setEditErr('Chưa lưu được thay đổi. Vui lòng thử lại.');
  };

  const handleAiClassifyEdit = async () => {
    if (!editForm.title.trim() || isEditClassifying) return;
    setIsEditClassifying(true);
    try {
      const res = await classifyReport(editForm.title, editForm.description || '');
      if (latestEditForm.current.title !== editForm.title || latestEditForm.current.description !== editForm.description) return;
      setEditAiSuggestion(res);
      setEditForm(f => ({
        ...f,
        type: res.type,
        tags: Array.from(new Set([...(f.tags || []), ...(res.tags || [])]))
      }));
    } catch (error) {
      setEditErr(error.message);
    } finally {
      setIsEditClassifying(false);
    }
  };

  // ── Xử lý Gom nhóm Tài liệu theo Chủ đề bằng AI ─────────────────────────────
  const runClustering = async () => {
    if (approved.length === 0) return;
    setIsClustering(true);
    try {
      const res = await groupReportsByTopic(approved);
      if (res && res.topics && res.topics.length > 0) {
        setTopicClusters(res.topics);
        setIsGroupedByTopic(true);
        setSelectedTopicFilter('all');
        toast(`AI đã sắp xếp ${approved.length} tài liệu thành ${res.topics.length} chủ đề!`, 'success');
      } else {
        toast('Không thể phân loại chủ đề. Hãy thử lại.', 'error');
      }
    } catch (err) {
      console.error(err);
      toast(err.message || 'Lỗi khi phân loại chủ đề.', 'error');
    } finally {
      setIsClustering(false);
    }
  };

  const handleToggleAiGrouping = async () => {
    if (isGroupedByTopic) {
      setIsGroupedByTopic(false);
      return;
    }
    if (approved.length === 0) {
      toast('Chưa có tài liệu nào để phân loại chủ đề!', 'info');
      return;
    }

    if (topicClusters.length > 0) {
      setIsGroupedByTopic(true);
      return;
    }

    await runClustering();
  };

  const handleRefreshAiGrouping = async () => {
    await runClustering();
  };

  const filteredTopicClusters = useMemo(() => {
    if (!isGroupedByTopic) return [];
    if (selectedTopicFilter === 'all') return topicClusters;
    return topicClusters.filter(t => t.id === selectedTopicFilter);
  }, [isGroupedByTopic, selectedTopicFilter, topicClusters]);

  const cardProps = { 
    getMemberById, 
    isCore, 
    isSuperAdmin, 
    currentUser, 
    approveReport, 
    updateReport, 
    deleteReport, 
    onEdit: handleOpenEdit 
  };

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
            onClick={() => { 
              setForm({ title: '', link: '', type: activeTab, tags: [] }); 
              setSelectedFile(null); 
              setErr(''); 
              setAddAiSuggestion(null);
              setShowModal(true); 
            }}
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
              type="text" placeholder="Tìm theo tên, link, tag..." value={search} onChange={e => setSearch(e.target.value)}
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
                        <p className="text-[10px] text-gray-500 mt-0.5">Nhấn "Duyệt" để phê duyệt hoặc chỉnh sửa/phân loại lại</p>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    Đã phê duyệt
                    <span className="text-xs font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      {approved.length}
                    </span>
                  </h2>
                </div>

                {/* Nút AI Phân loại theo chủ đề */}
                {approved.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleToggleAiGrouping}
                      disabled={isClustering}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        isGroupedByTopic
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-900/30'
                          : 'bg-[#1e1e1e] hover:bg-[#252525] text-purple-400 hover:text-purple-300 border border-purple-500/30'
                      }`}
                      title="Tự động sắp xếp các tài liệu thành các chủ đề học thuật bằng AI"
                    >
                      {isClustering ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>{isGroupedByTopic ? 'Đang gom theo chủ đề AI' : 'AI Phân loại theo chủ đề'}</span>
                      {isGroupedByTopic && (
                        <span
                          onClick={(e) => { e.stopPropagation(); setIsGroupedByTopic(false); }}
                          className="ml-1 p-0.5 hover:bg-black/30 rounded"
                          title="Tắt xem theo chủ đề"
                        >
                          <X className="w-3 h-3" />
                        </span>
                      )}
                    </button>

                    {isGroupedByTopic && (
                      <button
                        onClick={handleRefreshAiGrouping}
                        disabled={isClustering}
                        className="p-1.5 text-gray-400 hover:text-white bg-[#1e1e1e] hover:bg-[#252525] border border-gray-700 rounded-xl transition-all"
                        title="Làm mới phân loại chủ đề bằng AI"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isClustering ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Thanh lọc theo từng chủ đề nếu đang bật chế độ nhóm AI */}
              {isGroupedByTopic && topicClusters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-purple-950/20 border border-purple-500/20 rounded-2xl mb-5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 mr-1 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Chủ đề:</span>
                  </div>
                  <button
                    onClick={() => setSelectedTopicFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTopicFilter === 'all'
                        ? 'bg-purple-600 text-white shadow'
                        : 'bg-[#1e1e1e] text-gray-400 hover:text-white'
                    }`}
                  >
                    Tất cả ({approved.length})
                  </button>
                  {topicClusters.map(t => {
                    const count = approved.filter(r => (t.reportIds || []).includes(r.id)).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTopicFilter(t.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          selectedTopicFilter === t.id
                            ? 'bg-purple-600 text-white shadow'
                            : 'bg-[#1e1e1e] text-gray-400 hover:text-white'
                        }`}
                      >
                        <span>{t.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {approved.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 border border-dashed border-gray-800 rounded-2xl"
                >
                  <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm font-medium">Chưa có tài liệu nào trong danh mục này</p>
                  <p className="text-gray-600 text-xs mt-1">Hãy là người đầu tiên chia sẻ!</p>
                </motion.div>
              ) : isGroupedByTopic ? (
                /* Hiển thị sắp xếp theo các Chủ đề AI */
                <div className="space-y-6">
                  {filteredTopicClusters.map(topic => {
                    const reportsInTopic = approved.filter(r => (topic.reportIds || []).includes(r.id));
                    if (reportsInTopic.length === 0) return null;

                    return (
                      <motion.div
                        key={topic.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className="flex items-start justify-between bg-gradient-to-r from-purple-900/20 via-[#1c1c1c] to-transparent border-l-4 border-purple-500 rounded-r-2xl p-3.5 px-4 shadow-sm">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-black text-white flex items-center gap-2">
                                <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                                {topic.name}
                              </h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                                {reportsInTopic.length} tài liệu
                              </span>
                              {topic.tag && (
                                <span className="text-[10px] font-medium text-gray-400 px-2 py-0.5 rounded bg-[#252525]">
                                  #{topic.tag}
                                </span>
                              )}
                            </div>
                            {topic.description && (
                              <p className="text-xs text-gray-400 mt-1">{topic.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          <AnimatePresence mode="popLayout">
                            {reportsInTopic.map((r) => (
                              <ReportCard key={r.id} r={r} {...cardProps} />
                            ))}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* Hiển thị danh sách thông thường theo thời gian */
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

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên tài liệu <span className="text-red-500">*</span></label>
                    <span className="text-[10px] text-gray-500">{form.title.length} ký tự</span>
                  </div>
                  <input
                    type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="VD: Báo cáo seminar màng mỏng ALD..."
                    className="w-full h-10 px-4 bg-[#121212] border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tài liệu đính kèm <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type="file" disabled={isUploading || isSaving}
                      onChange={e => {
                        const file = e.target.files[0];
                        setSelectedFile(file);
                        setForm(f=>({...f, link: ''}));
                        if (file && !form.title.trim()) {
                          const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                          setForm(f=>({...f, title: nameWithoutExt}));
                        }
                      }}
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
                    type="url" value={form.link} disabled={isUploading || isSaving}
                    onChange={e => { setForm({...form, link: e.target.value}); setSelectedFile(null); }}
                    placeholder="https://docs.google.com/..."
                    className="w-full h-10 px-4 bg-[#121212] border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Phân loại & AI Button */}
                <div className="space-y-1.5">
                  <label htmlFor="report-description" className="text-xs font-bold text-gray-400">Mô tả hoặc trích đoạn cho DeepSeek</label>
                  <textarea id="report-description" maxLength={6000} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-xl border border-gray-700 bg-[#121212] p-3 text-sm text-white" placeholder="Tóm tắt nội dung để AI phân loại chính xác hơn…" />
                  <p className="text-xs text-gray-500">AI dùng tiêu đề và mô tả bạn nhập; không đọc nội dung file từ đường dẫn. Nội dung này sẽ được gửi tới DeepSeek khi bấm phân loại.</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phân loại danh mục</label>
                    <button
                      type="button"
                      onClick={handleAiClassifyAdd}
                      disabled={isAddClassifying || !form.title.trim()}
                      className="text-[11px] font-bold text-purple-400 hover:text-purple-300 disabled:opacity-40 flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20"
                    >
                      {isAddClassifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI Tự động phân loại
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'event',    label: 'Sự kiện' },
                      { id: 'research', label: 'Nghiên cứu' },
                      { id: 'book',     label: 'Sách' },
                    ].map(t => (
                      <button key={t.id} type="button" onClick={() => setForm({...form, type: t.id})}
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

                {/* AI Suggestion preview */}
                {addAiSuggestion && (
                  <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" /> AI Đề xuất: <span className="text-white underline">{addAiSuggestion.typeName}</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        {addAiSuggestion.confidence}% tin cậy
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-snug">{addAiSuggestion.reason}</p>
                    {addAiSuggestion.suggestedTitle && addAiSuggestion.suggestedTitle !== form.title && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, title: addAiSuggestion.suggestedTitle }))}
                        className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium flex items-center gap-1 mt-1 text-left"
                      >
                        Áp dụng tên gợi ý chuẩn hóa: "{addAiSuggestion.suggestedTitle}"
                      </button>
                    )}
                    {addAiSuggestion.tags && addAiSuggestion.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {addAiSuggestion.tags.map((t, idx) => (
                          <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-purple-300 border border-purple-500/20">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

              <div className="p-5 border-t border-gray-800 bg-[#121212] rounded-b-2xl flex justify-end gap-3">
                <button onClick={() => setShowModal(false)}
                  className="px-5 h-10 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors btn-active">
                  Hủy
                </button>
                <button onClick={handleAdd} disabled={isUploading || isSaving}
                  className="px-6 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 btn-active shadow-lg shadow-blue-600/20">
                  {isUploading ? <><Clock className="w-4 h-4 animate-spin" /> Đang tải lên...</> : 'Đăng tài liệu'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Chỉnh sửa tài liệu ── */}
      <AnimatePresence>
        {editingReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" 
            onClick={() => setEditingReport(null)}
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
                  <Pencil className="w-4 h-4 text-blue-500" /> Chỉnh sửa tài liệu
                </h3>
                <button onClick={() => setEditingReport(null)} className="text-gray-500 hover:text-white p-1 transition-colors btn-active">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {editErr && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{editErr}</p>
                  </div>
                )}

                {/* Tên tài liệu */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Tên tài liệu / báo cáo <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-gray-500">{editForm.title.length} ký tự</span>
                  </div>
                  <input
                    type="text" 
                    value={editForm.title} 
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="VD: Báo cáo seminar vật liệu 2D..."
                    className="w-full h-10 px-4 bg-[#121212] border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Link tài liệu */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Link tài liệu (URL)</label>
                  <input
                    type="url" 
                    value={editForm.link} 
                    onChange={e => setEditForm({ ...editForm, link: e.target.value })}
                    placeholder="https://..."
                    className="w-full h-10 px-4 bg-[#121212] border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Phân loại & AI Button */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phân loại danh mục</label>
                    <button
                      type="button"
                      onClick={handleAiClassifyEdit}
                      disabled={isEditClassifying || !editForm.title.trim()}
                      className="text-[11px] font-bold text-purple-400 hover:text-purple-300 disabled:opacity-40 flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20"
                    >
                      {isEditClassifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI Gợi ý phân loại
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'event',    label: 'Sự kiện' },
                      { id: 'research', label: 'Nghiên cứu' },
                      { id: 'book',     label: 'Sách' },
                    ].map(t => (
                      <button key={t.id} type="button" onClick={() => setEditForm({ ...editForm, type: t.id })}
                        className={`h-10 rounded-xl text-sm font-semibold transition-all border btn-active ${
                          editForm.type === t.id
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                            : 'bg-[#121212] border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-report-description" className="text-xs font-bold text-gray-400">Mô tả hoặc trích đoạn cho DeepSeek</label>
                  <textarea id="edit-report-description" maxLength={6000} value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="w-full rounded-xl border border-gray-700 bg-[#121212] p-3 text-sm text-white" />
                  <p className="text-xs text-gray-500">AI chỉ dùng tiêu đề và mô tả, không đọc file từ liên kết.</p>
                </div>
                {/* AI Suggestion preview in edit */}
                {editAiSuggestion && (
                  <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" /> AI Đề xuất: <span className="text-white underline">{editAiSuggestion.typeName}</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        {editAiSuggestion.confidence}% tin cậy
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-snug">{editAiSuggestion.reason}</p>
                    {editAiSuggestion.suggestedTitle && editAiSuggestion.suggestedTitle !== editForm.title && (
                      <button
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, title: editAiSuggestion.suggestedTitle }))}
                        className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium flex items-center gap-1 mt-1 text-left"
                      >
                        Áp dụng tên AI chuẩn hoá: "{editAiSuggestion.suggestedTitle}"
                      </button>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Từ khóa / Tags (phân cách bằng dấu phẩy)</label>
                  <input
                    type="text" 
                    value={(editForm.tags || []).join(', ')} 
                    onChange={e => {
                      const tags = e.target.value.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean);
                      setEditForm({ ...editForm, tags });
                    }}
                    placeholder="VD: Bán dẫn, ALD, Seminar..."
                    className="w-full h-10 px-4 bg-[#121212] border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                  {(editForm.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {editForm.tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 border-t border-gray-800 bg-[#121212] rounded-b-2xl flex justify-end gap-3">
                <button onClick={() => setEditingReport(null)}
                  className="px-5 h-10 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors btn-active">
                  Hủy
                </button>
                <button onClick={handleSaveEdit} disabled={isSaving || isEditClassifying}
                  className="px-6 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 btn-active shadow-lg shadow-blue-600/20">
                  Lưu thay đổi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
