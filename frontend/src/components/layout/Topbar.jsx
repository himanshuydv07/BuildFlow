import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, LogOut, ChevronDown, UserX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../lib/resources';
import { Avatar } from '../ui/Display';
import { Modal } from '../ui/Overlay';
import { Input, FormField } from '../ui/Form';
import Button from '../ui/Button';
import NotificationPanel from '../notifications/NotificationPanel';

export default function Topbar() {
  const { user, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef(null);

  const { data } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.list({ unreadOnly: true, limit: 1 }).then((r) => r.data.data.unreadCount),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteAccount(password);
      toast.success('Account deleted');
      navigate('/login');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-6">
      <form onSubmit={submitSearch} className="w-80 max-w-full">
        <div className="flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-1.5 transition-colors focus-within:border-signal focus-within:bg-white focus-within:ring-1 focus-within:ring-signal/30">
          <Search size={15} className="text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, tasks, people…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />
        </div>
      </form>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-paper"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {data > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">
                {data > 9 ? '9+' : data}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-paper">
            <Avatar name={user?.name} size={7} />
            <span className="text-sm font-medium text-ink">{user?.name?.split(' ')[0]}</span>
            <ChevronDown size={14} className="text-ink-faint" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 rounded-md border border-line bg-white py-1 shadow-pop">
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-muted hover:bg-paper hover:text-ink"
              >
                <LogOut size={14} /> Log out
              </button>
              <div className="my-1 border-t border-line" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-coral hover:bg-coral-faint"
              >
                <UserX size={14} /> Delete account
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setPassword('');
          setDeleteError('');
        }}
        title="Delete your account"
      >
        <p className="text-sm text-ink-muted">
          This <strong>permanently</strong> deletes your account. You'll be removed from every project you're a
          member of. This cannot be undone.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          If you still own any active project, transfer ownership or archive it first — this action is blocked
          until then.
        </p>
        <form onSubmit={confirmDelete} className="mt-4 space-y-3">
          <FormField label="Confirm your password" error={deleteError}>
            <Input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={deleting}>
              Permanently delete account
            </Button>
          </div>
        </form>
      </Modal>
    </header>
  );
}