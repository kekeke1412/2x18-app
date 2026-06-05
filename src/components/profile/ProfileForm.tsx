// @ts-nocheck
import React from 'react';
import { User, Calendar, CreditCard, Phone, MapPin, Lock } from 'lucide-react';
import { Field } from '../ui/Field';
import { Section } from '../ui/Section';
import { ProfileCompletionBanner } from './ProfileCompletionBanner';
import { roleLabel, getInitials } from '../../utils/stringUtils';
import { GENDERS, ETHNICITIES, BLOOD_TYPES, PROVINCES } from '../../constants/profileConstants';

export function ProfileForm({ profile, setProfile, isEditing, isSuperAdmin, isOwnProfile, onStartEdit }) {
  const rl = roleLabel(profile.role);
  const loginEmail = profile.email || '';

  return (
    <>
      {isOwnProfile && (
        <ProfileCompletionBanner profile={profile} isEditing={isEditing} onStartEdit={onStartEdit} />
      )}

      <Section icon={User} title="Nhận diện">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2 md:col-span-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ảnh đại diện</label>
            {isEditing ? (
              <>
                <input type="url" value={profile.avatarUrl || ''} onChange={e => setProfile(p => ({ ...p, avatarUrl: e.target.value }))}
                  placeholder="https://... (link ảnh trực tiếp)"
                  className="text-sm px-3 py-2 rounded-xl bg-[#252525] border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none w-full" />
                {profile.avatarUrl && (
                  <img src={profile.avatarUrl} alt="preview"
                    className="w-12 h-12 rounded-xl object-cover border border-gray-700"
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
              </>
            ) : profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-700" />
            ) : (
              <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold text-sm">
                {getInitials(profile.fullName)}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <Field label="Biệt danh" value={profile.nickname} onChange={v => setProfile(p => ({ ...p, nickname: v }))} disabled={!isEditing} />
          </div>
        </div>
      </Section>

      <Section icon={User} title="Thông tin cơ bản">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="STT" value={profile.stt} onChange={v => setProfile(p => ({ ...p, stt: v }))} disabled={!isEditing || !isSuperAdmin} />
          <Field label="MSV" required value={profile.mssv || profile.msv} onChange={v => setProfile(p => ({ ...p, mssv: v, msv: v }))} disabled={!isEditing} />

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Chức vụ</label>
            {isSuperAdmin && isEditing && profile.role !== 'super_admin' ? (
              <select value={profile.role || 'member'} onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}
                className="text-sm px-3 py-2 rounded-xl outline-none bg-[#252525] border border-gray-700 text-white focus:border-blue-500">
                <option value="member">Thành viên</option>
                <option value="core">Core Team</option>
              </select>
            ) : (
              <div className={`text-xs font-bold px-3 py-2 rounded-xl inline-flex w-fit mt-0.5 ${rl.cls}`}>
                {rl.text}
              </div>
            )}
          </div>

          <Field label="Họ và tên" required value={profile.fullName} onChange={v => setProfile(p => ({ ...p, fullName: v }))} disabled={!isEditing} />
          <Field label="Giới tính" required value={profile.gender} onChange={v => setProfile(p => ({ ...p, gender: v }))} options={GENDERS} disabled={!isEditing} />
          <Field label="Ngày sinh" required value={profile.dob} onChange={v => setProfile(p => ({ ...p, dob: v }))} type="date" disabled={!isEditing} />
          <Field label="Dân tộc" required value={profile.ethnicity} onChange={v => setProfile(p => ({ ...p, ethnicity: v }))} options={ETHNICITIES} disabled={!isEditing} />
          <Field label="Nhóm máu" required value={profile.bloodType} onChange={v => setProfile(p => ({ ...p, bloodType: v }))} options={BLOOD_TYPES} disabled={!isEditing} />
          <Field label="Nơi sinh" required value={profile.pob} onChange={v => setProfile(p => ({ ...p, pob: v }))} options={PROVINCES} disabled={!isEditing} />
        </div>
      </Section>

      <Section icon={Calendar} title="Đoàn – Đảng" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ngày vào Đoàn" value={profile.joinedYouth} onChange={v => setProfile(p => ({ ...p, joinedYouth: v }))} type="date" disabled={!isEditing} />
          <Field label="Ngày vào Đảng" value={profile.joinedParty} onChange={v => setProfile(p => ({ ...p, joinedParty: v }))} type="date" disabled={!isEditing} />
        </div>
      </Section>

      <Section icon={CreditCard} title="Giấy tờ & Ngân hàng" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Số CCCD" value={profile.cccd} onChange={v => setProfile(p => ({ ...p, cccd: v }))} disabled={!isEditing} />
          <Field label="STK ngân hàng (BIDV)" value={profile.bank} onChange={v => setProfile(p => ({ ...p, bank: v }))} disabled={!isEditing} />
        </div>
      </Section>

      <Section icon={Phone} title="Liên hệ">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="SĐT" required value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} type="tel" disabled={!isEditing} />
          <Field label="SĐT người thân" value={profile.phoneFamily} onChange={v => setProfile(p => ({ ...p, phoneFamily: v }))} type="tel" disabled={!isEditing} />
          <Field label="Mail HUS" required value={profile.mailSchool} onChange={v => setProfile(p => ({ ...p, mailSchool: v }))} type="email" disabled={!isEditing} />
          <Field label="Mail VNU" required value={profile.mailVnu} onChange={v => setProfile(p => ({ ...p, mailVnu: v }))} type="email" disabled={!isEditing} />
          <Field label="Facebook" required value={profile.facebook} onChange={v => setProfile(p => ({ ...p, facebook: v }))} disabled={!isEditing} />

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              Mail đăng nhập
              <Lock className="w-2.5 h-2.5 text-gray-600" />
            </label>
            <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-[#1a1a1a] border border-gray-800 text-gray-400">
              <span className="flex-1 truncate">{loginEmail || '—'}</span>
              <span className="text-[9px] font-bold text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-md shrink-0">Cố định</span>
            </div>
            <p className="text-[10px] text-gray-600">Email dùng để đăng nhập, không thể thay đổi.</p>
          </div>
        </div>
      </Section>

      <Section icon={MapPin} title="Địa chỉ" defaultOpen={false}>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Quê quán" value={profile.hometown} onChange={v => setProfile(p => ({ ...p, hometown: v }))} options={PROVINCES} disabled={!isEditing} />
          <Field label="Nơi thường trú" value={profile.permanentAddress} onChange={v => setProfile(p => ({ ...p, permanentAddress: v }))} disabled={!isEditing} />
          <Field label="Nơi ở hiện tại" value={profile.currentAddress} onChange={v => setProfile(p => ({ ...p, currentAddress: v }))} disabled={!isEditing} />
        </div>
      </Section>
    </>
  );
}

