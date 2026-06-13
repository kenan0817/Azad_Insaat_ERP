import React, { useState, useRef } from 'react';
import {
  Save, AlertTriangle, Settings as SettingsIcon, Sparkles, Download, Upload,
  Users, KeyRound, Plus, Trash2, X,
} from 'lucide-react';
import { AppSettings, User, AuditAction, UserRole } from '../types';
import { toast } from './Toast';
import { hashPassword } from '../services/auth';
import { exportBackup, importBackup, PersistedData } from '../services/storage';
import { generateId } from '../utils/id';
import ConfirmModal from './ConfirmModal';

interface SettingsProps {
  appSettings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  onCurrentUserUpdate: (user: User) => void;
  onRestoreBackup: (data: PersistedData) => void;
  getPersistedData: () => PersistedData;
  addLog: (action: AuditAction, details: string) => void;
}

const Settings: React.FC<SettingsProps> = ({
  appSettings,
  onUpdateSettings,
  users,
  setUsers,
  currentUser,
  onCurrentUserUpdate,
  onRestoreBackup,
  getPersistedData,
  addLog,
}) => {
  const [threshold, setThreshold] = useState(appSettings.lowStockThreshold);
  const [aiEnabled, setAiEnabled] = useState(appSettings.aiEnabled);
  const [storeName, setStoreName] = useState(appSettings.storeName);
  const [storePhone, setStorePhone] = useState(appSettings.storePhone);
  const [storeAddress, setStoreAddress] = useState(appSettings.storeAddress);
  const [largeSaleThreshold, setLargeSaleThreshold] = useState(appSettings.largeSaleThreshold);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState<{ name: string; username: string; password: string; role: UserRole }>({
    name: '', username: '', password: '', role: 'EMEKDAS',
  });
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMudir = currentUser.role === 'MUDIR';

  const handleSaveSettings = () => {
    onUpdateSettings({
      lowStockThreshold: threshold,
      aiEnabled,
      storeName,
      storePhone,
      storeAddress,
      largeSaleThreshold,
    });
    toast.success('Tənzimləmələr yadda saxlanıldı!');
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast.error('Şifrə ən azı 4 simvol olmalıdır');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Şifrələr uyğun gəlmir');
      return;
    }

    const hash = await hashPassword(newPassword);
    const updated: User = { ...currentUser, passwordHash: hash, mustChangePassword: false };
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
    onCurrentUserUpdate(updated);
    setNewPassword('');
    setConfirmPassword('');
    addLog(AuditAction.UPDATE, `${currentUser.name} şifrəsini dəyişdi`);
    toast.success('Şifrə uğurla dəyişdirildi');
  };

  const handleAddUser = async () => {
    if (!userForm.name || !userForm.username || !userForm.password) return;
    if (users.some((u) => u.username.toLowerCase() === userForm.username.toLowerCase())) {
      toast.error('Bu istifadəçi adı artıq mövcuddur');
      return;
    }

    const newUser: User = {
      id: generateId(),
      name: userForm.name,
      username: userForm.username,
      passwordHash: await hashPassword(userForm.password),
      role: userForm.role,
    };
    setUsers((prev) => [...prev, newUser]);
    addLog(AuditAction.ADD, `Yeni istifadəçi əlavə edildi: ${newUser.name} (${newUser.role})`);
    toast.success('İstifadəçi əlavə edildi');
    setShowUserModal(false);
    setUserForm({ name: '', username: '', password: '', role: 'EMEKDAS' });
  };

  const handleExport = () => {
    exportBackup(getPersistedData());
    addLog(AuditAction.UPDATE, 'Məlumatlar backup faylına ixrac edildi');
    toast.success('Backup faylı yükləndi');
  };

  const handleImportFile = async (file: File) => {
    try {
      const data = await importBackup(file);
      onRestoreBackup(data);
      setRestoreConfirm(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Backup yüklənə bilmədi');
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6 pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <SettingsIcon className="text-slate-600" />
          Sistem Tənzimləmələri
        </h2>

        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <label className="block text-sm font-bold text-slate-800">Mağaza məlumatları (qaimə üçün)</label>
            <input
              type="text"
              placeholder="Mağaza adı"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full border border-slate-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Telefon"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              className="w-full border border-slate-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Ünvan"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full border border-slate-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Böyük satış təsdiq limiti (₼)</label>
              <input
                type="number"
                min={0}
                value={largeSaleThreshold}
                onChange={(e) => setLargeSaleThreshold(Number(e.target.value))}
                className="w-32 border border-slate-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
            <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              Kritik Anbar Limiti
            </label>
            <p className="text-sm text-slate-600 mb-4">
              Məhsul sayı bu rəqəmdən aşağı düşdükdə sistem xəbərdarlıq edəcək.
            </p>
            <input
              type="number"
              min="1"
              className="border border-amber-200 p-2 rounded-lg w-32 focus:ring-2 focus:ring-amber-500 outline-none"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </div>

          {isMudir && (
            <div className="bg-violet-50 p-4 rounded-lg border border-violet-100">
              <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Sparkles size={18} className="text-violet-600" />
                AI Köməkçi
              </label>
              <p className="text-sm text-slate-600 mb-4">
                Aktiv olduqda Ağıllı Köməkçi menyusu görünəcək. GEMINI_API_KEY .env.local faylında təyin edilməlidir.
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm font-medium text-slate-700">AI Köməkçini aktiv et</span>
              </label>
            </div>
          )}

          <button
            onClick={handleSaveSettings}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
          >
            <Save size={18} />
            Yadda Saxla
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <KeyRound className="text-slate-600" />
          Şifrə Dəyişdir
        </h2>
        {currentUser.mustChangePassword && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
            Təhlükəsizlik üçün şifrənizi dəyişməyiniz tövsiyə olunur.
          </div>
        )}
        <div className="space-y-3 max-w-md">
          <input
            type="password"
            placeholder="Yeni şifrə"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Yeni şifrəni təsdiqlə"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleChangePassword}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium"
          >
            Şifrəni Dəyiş
          </button>
        </div>
      </div>

      {isMudir && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-slate-600" />
                İstifadəçilər ({users.length})
              </h2>
              <button
                onClick={() => setShowUserModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
              >
                <Plus size={16} /> Əlavə et
              </button>
            </div>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="font-medium text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-500">@{u.username} · {u.role === 'MUDIR' ? 'Müdir' : 'Əməkdaş'}</p>
                  </div>
                  {u.id !== currentUser.id && (
                    <button
                      onClick={() => setDeleteUserTarget(u)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Download className="text-slate-600" />
              Məlumat Backup
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Bütün məlumatları JSON fayla ixrac edin və ya əvvəlki backup-dan bərpa edin.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                <Download size={18} /> İxrac et
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                <Upload size={18} /> İdxal et
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setRestoreConfirm(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg">Yeni İstifadəçi</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Ad Soyad"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
              />
              <input
                type="text"
                placeholder="İstifadəçi adı"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
              />
              <input
                type="password"
                placeholder="Şifrə"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
              />
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
              >
                <option value="EMEKDAS">Əməkdaş</option>
                <option value="MUDIR">Müdir</option>
              </select>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setShowUserModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">
                Ləğv et
              </button>
              <button
                onClick={handleAddUser}
                disabled={!userForm.name || !userForm.username || !userForm.password}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                Əlavə et
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteUserTarget && (
        <ConfirmModal
          title="İstifadəçini sil"
          message={`"${deleteUserTarget.name}" silinsin?`}
          confirmLabel="Sil"
          variant="danger"
          onConfirm={() => {
            setUsers((prev) => prev.filter((u) => u.id !== deleteUserTarget.id));
            addLog(AuditAction.DELETE, `İstifadəçi silindi: ${deleteUserTarget.name}`);
            toast.info(`${deleteUserTarget.name} silindi`);
            setDeleteUserTarget(null);
          }}
          onCancel={() => setDeleteUserTarget(null)}
        />
      )}

      {restoreConfirm && (
        <ConfirmModal
          title="Backup bərpa et"
          message="Cari məlumatlar backup ilə əvəz olunacaq. Davam edilsin?"
          confirmLabel="Bərpa et"
          variant="warning"
          onConfirm={() => handleImportFile(restoreConfirm)}
          onCancel={() => setRestoreConfirm(null)}
        />
      )}
    </div>
  );
};

export default Settings;
