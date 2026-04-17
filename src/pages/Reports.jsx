import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, ExternalLink, Plus, X, Trash2, CheckCircle, 
  Clock, ShieldCheck, AlertCircle, BookOpen, Search
} from 'lucide-react';
import { uploadToDrive } from '../services/googleApi';

export default function Reports() {
  const { 
    reports = [], currentUser, isCore, isSuperAdmin, 
    addReport, approveReport, deleteReport, getMemberById, requireGoogleAuth
  } = useApp();

  const [activeTab, setActiveTab] = useState('event');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  
  const [form, setForm] = useState({ title: '', link: '', type: 'event' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [err, setErr] = useState('');

  // ── Lọc dữ liệu ───────────────────────────────────────────────────────────
  const { pending, approved } = useMemo(() => {
    const list = reports
      .filter(r => r.type === activeTab)
      .filter(r => (r.title || '').toLowerCase().includes(search.toLowerCase()) || (r.link || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const pendingList = [];
    const approvedList = [];

    list.forEach(r => {
      if (r.status === 'pending') {
        // Core/SuperAdmin thấy hết. Member chỉ thấy của chính mình.
        if (isCore || isSuperAdmin || r.authorId === currentUser?.id) {
          pendingList.push(r);
        }
      } else {
        approvedList.push(r);
      }
    });

    return { pending: pendingList, approved: approvedList };
  }, [reports, activeTab, search, isCore, isSuperAdmin, currentUser?.id]);

  // ── Xử lý thêm ────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.title.trim()) return setErr('Vui lòng nhập tên tài liệu');
    if (!selectedFile && (!form.link.trim() || !form.link.startsWith('http'))) return setErr('Vui lòng chọn file hoặc nhập link hợp lệ');
    
    setErr('');
    let finalLink = form.link.trim();

    if (selectedFile) {
      setIsUploading(true);
      try {
        const token = await requireGoogleAuth();
        if (!token) {
          setIsUploading(false);
          return;
        }
        finalLink = await uploadToDrive(token, selectedFile);
      } catch (error) {
        setIsUploading(false);
        return setErr(error.message || 'Lỗi khi tải file lên Google Drive');
      }
      setIsUploading(false);
    }

    // Đảm bảo type luôn khớp với tab đang đứng nếu người dùng không chọn khác
    addReport({
      title: form.title.trim(),
      link: finalLink,
      type: form.type || activeTab,
      status: (isCore || isSuperAdmin) ? 'approved' : 'pending',
      authorId: currentUser?.id,
    });
    
    setShowModal(false);
    setForm({ title: '', link: '', type: activeTab });
    setSelectedFile(null);
  };

  // ── Render 1 Card ─────────────────────────────────────────────────────────
  const renderCard = (r, isPending) => {
    const author = getMemberById(r.authorId);
    
    return (
      <div key={r.id} className="p-4 bg-[#1e1e1e] border border-gray-800 rounded-2xl flex flex-col gap-3 hover:border-gray-700 transition-colors">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white truncate" title={r.title}>{r.title}</h3>
            <a href={r.link} target="_blank" rel="noreferrer" 
               className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Mở liên kết
            </a>
          </div>
          
          <div className="flex items-center gap-1.5">
            {isPending && (isCore || isSuperAdmin) && (
              <button onClick={() => approveReport(r.id)} title="Duyệt tài liệu này"
                className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors">
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            {(isCore || isSuperAdmin) && (
              <button onClick={() => { if(confirm('Bạn có chắc muốn xóa tài liệu này?')) deleteReport(r.id); }} title="Xóa tài liệu"
                className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {isPending && !isCore && !isSuperAdmin && (
              <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg flex items-center gap-1.5">
                <Clock className="w-3 h-3"/> Đang chờ duyệt
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-800/60">
          <div className="flex items-center gap-2">
            {author?.avatarUrl ? (
              <img src={author.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#252525] flex items-center justify-center text-[8px] font-bold text-gray-400">
                {author?.avatar || '?'}
              </div>
            )}
            <span className="text-xs text-gray-400">{author?.fullName || 'Thành viên ẩn'}</span>
          </div>
          <span className="text-[10px] text-gray-600">
            {new Date(r.createdAt).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#121212] overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-5 border-b border-gray-800/60 shrink-0 bg-[#1a1a1a]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-500" />
              Báo cáo & Sự kiện
            </h1>
            <p className="text-sm text-gray-400 mt-1">Lưu trữ tài liệu báo cáo nghiên cứu và tổng kết các sự kiện</p>
          </div>
          <button onClick={() => { setForm({ ...form, type: activeTab }); setSelectedFile(null); setShowModal(true); }}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shrink-0">
            <Plus className="w-4 h-4" /> Thêm tài liệu
          </button>
        </div>
      </div>

      {/* ── Filter / Tabs ── */}
      <div className="px-6 py-4 border-b border-gray-800/60 shrink-0 bg-[#1a1a1a]/50 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex bg-[#252525] p-1 rounded-xl">
          {[
            { id: 'event', label: 'Tóm tắt sự kiện' },
            { id: 'research', label: 'Báo cáo nghiên cứu' }
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold tab-transition ${
                activeTab === t.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Tìm kiếm tài liệu..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-[#1e1e1e] border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* ── Content List ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 fade-in-up">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Pending Section */}
          {pending.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-white">Đang chờ duyệt <span className="text-gray-500 ml-1">({pending.length})</span></h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pending.map(r => renderCard(r, true))}
              </div>
            </section>
          )}

          {/* Approved Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h2 className="text-base font-bold text-white">Đã phê duyệt <span className="text-gray-500 ml-1">({approved.length})</span></h2>
            </div>
            
            {approved.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-gray-800 rounded-2xl bg-[#1a1a1a]/50">
                <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Chưa có tài liệu nào trong mục này.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {approved.map(r => renderCard(r, false))}
              </div>
            )}
          </section>

        </div>
      </div>

      {/* ── Modal Add ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm backdrop-enter" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md bg-[#1a1a1a] border border-gray-800 rounded-2xl shadow-2xl flex flex-col modal-enter" onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Thêm tài liệu mới
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white p-1 transition-colors">
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tên tài liệu <span className="text-red-500">*</span></label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="VD: Báo cáo seminar vật liệu 2D"
                  className="w-full h-11 px-4 bg-[#121212] border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tài liệu đính kèm <span className="text-red-500">*</span></label>
                
                {/* Custom File Input */}
                <div className="relative">
                  <input type="file" onChange={e => { setSelectedFile(e.target.files[0]); setForm({...form, link: ''}) }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploading}
                  />
                  <div className={`w-full h-11 px-4 flex items-center border rounded-xl text-sm transition-all ${selectedFile ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-[#121212] border-gray-700 text-gray-500'}`}>
                    <span className="truncate">{selectedFile ? selectedFile.name : 'Nhấn để chọn file từ máy tính...'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 my-2">
                  <div className="h-px bg-gray-800 flex-1"></div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Hoặc dán link</span>
                  <div className="h-px bg-gray-800 flex-1"></div>
                </div>

                <input type="url" value={form.link} onChange={e => { setForm({...form, link: e.target.value}); setSelectedFile(null) }} 
                  placeholder="https://docs.google.com/..." disabled={isUploading}
                  className={`w-full h-11 px-4 bg-[#121212] border rounded-xl text-sm transition-all outline-none ${form.link ? 'border-blue-500 focus:ring-1 focus:ring-blue-500 text-white' : 'border-gray-700 text-white placeholder:text-gray-600'}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Phân loại</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'event', label: 'Sự kiện' },
                    { id: 'research', label: 'Nghiên cứu' }
                  ].map(t => (
                    <button key={t.id} onClick={() => setForm({...form, type: t.id})}
                      className={`h-10 rounded-xl text-sm font-semibold transition-all border ${
                        form.type === t.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-[#121212] border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {!(isCore || isSuperAdmin) && (
                <div className="flex items-start gap-2.5 p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-xl mt-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Tài liệu của bạn sẽ được chuyển vào trạng thái <strong className="text-amber-400">Chờ duyệt</strong>. Core Team sẽ kiểm tra và phê duyệt trước khi hiển thị cho mọi người.
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-800 bg-[#121212] rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="px-5 h-10 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors btn-active">
                Hủy
              </button>
              <button onClick={handleAdd} disabled={isUploading}
                className="px-6 h-10 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 btn-active">
                {isUploading ? <><Clock className="w-4 h-4 animate-spin"/> Đang tải lên...</> : 'Đăng tài liệu'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
