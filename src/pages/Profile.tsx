import React, { useState, useEffect } from 'react';
import { User, BookOpen, Users, CheckCircle2, AlertTriangle, Edit3, X, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { roleLabel, getInitials } from '../utils/stringUtils';
import { useLocation } from 'react-router-dom';
import { ProfileForm } from '../components/profile/ProfileForm';
import { GradesTable } from '../components/profile/GradesTable';
import { MembersTab } from '../components/profile/MembersTab';

import { useMembers } from '../hooks/useDomainQueries';

export default function Profile() {
  const {
    currentUser, updateProfile, myGrades, syncGrades,
    isProfileComplete, isCore, isSuperAdmin,
  } = useApp();

  const { data: members = [] } = useMembers();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(location.state?.tab || 'profile');
  const [isEditing, setIsEditing] = useState(false);
  const [profileState, setProfileState] = useState({ ...currentUser });

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  useEffect(() => {
    if (!isEditing) setProfileState({ ...currentUser });
  }, [currentUser, isEditing]);

  const complete = isProfileComplete(currentUser);
  const initials = getInitials(currentUser?.fullName);
  const rl = roleLabel(currentUser?.role);
  const activeMembers = members?.filter(m => m.status !== 'pending') || [];

  const handleSaveProfile = () => {
    updateProfile(profileState);
    setIsEditing(false);
  };
  const handleSaveGrades = (updatedGrades) => {
    syncGrades(currentUser.id, updatedGrades);
  };
  const handleCancelEdit = () => {
    setProfileState({ ...currentUser });
    setIsEditing(false);
  };

  const tabs = [
    { key: 'profile', label: 'Hồ sơ', icon: User },
    { key: 'grades', label: 'Bảng điểm', icon: BookOpen },
    ...(isCore || isSuperAdmin ? [{ key: 'members', label: 'Thành viên', icon: Users }] : []),
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="px-6 pt-6 pb-4 border-b border-gray-800/60 bg-[#121212] sticky top-0 z-20">
        <div className="flex items-center gap-4 mb-4">
          {currentUser?.avatarUrl
            ? <img src={currentUser.avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border border-gray-700" />
            : <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 font-bold text-lg">
              {initials}
            </div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-black text-white">{currentUser?.fullName || 'Thành viên'}</h1>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${rl.cls}`}>{rl.text}</span>
              {complete
                ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="w-3.5 h-3.5" /> Hồ sơ đầy đủ</span>
                : <span className="flex items-center gap-1 text-xs text-amber-400"><AlertTriangle className="w-3.5 h-3.5" /> Hồ sơ chưa đầy đủ</span>
              }
            </div>
            <div className="text-sm text-gray-500 mt-0.5">{currentUser?.mssv || currentUser?.msv || 'MSSV chưa cập nhật'} · {currentUser?.mailSchool || currentUser?.email || ''}</div>
          </div>

          {activeTab === 'profile' && (
            <div className="flex gap-2">
              {!isEditing && (
                <button onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all">
                  <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                </button>
              )}
              {isEditing && (
                <>
                  <button onClick={handleCancelEdit}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-gray-600 hover:bg-[#252525] text-gray-300 text-sm font-bold rounded-xl transition-all">
                    <X className="w-3.5 h-3.5" /> Huỷ
                  </button>
                  <button onClick={handleSaveProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all">
                    <Save className="w-3.5 h-3.5" /> Lưu
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.key}
              onClick={() => { setActiveTab(t.key); setIsEditing(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
                ${activeTab === t.key
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#252525]'}`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.key === 'members' && activeTab !== 'members' && (
                <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded-full">
                  {activeMembers.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'profile' && (
              <ProfileForm
                profile={profileState}
                setProfile={setProfileState}
                isEditing={isEditing}
                isSuperAdmin={isSuperAdmin}
                isOwnProfile={true}
                onStartEdit={() => setIsEditing(true)}
              />
            )}

            {activeTab === 'grades' && (
              <GradesTable
                profile={currentUser}
                grades={myGrades}
                onSave={handleSaveGrades}
                canEdit={true}
              />
            )}

            {activeTab === 'members' && (isCore || isSuperAdmin) && (
              <MembersTab />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}