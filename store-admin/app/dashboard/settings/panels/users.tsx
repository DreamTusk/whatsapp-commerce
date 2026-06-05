'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { UserRound, Mail, Plus, Trash2, Clock } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppSelect } from '@/components/ui/app-select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { StoreUser, StoreInvite } from '@/types'

type Tab = 'members' | 'invites'

export default function UsersPanel() {
  const [tab, setTab] = useState<Tab>('members')
  const [members, setMembers] = useState<StoreUser[]>([])
  const [invites, setInvites] = useState<StoreInvite[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [inviting, setInviting] = useState(false)

  // Roles available in the invite dropdown — add more here when ready
  const INVITE_ROLES = [
    { value: 'STAFF', label: 'Staff' },
  ]

  const [removeTarget, setRemoveTarget] = useState<StoreUser | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<StoreUser | null>(null)
  const [cancelTarget, setCancelTarget] = useState<StoreInvite | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  async function fetchAll() {
    setLoading(true)
    try {
      const [membersRes, invitesRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/invite'),
      ])
      setMembers(membersRes.data.members)
      setInvites(invitesRes.data.invites)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      await api.post('/api/invite', { email: inviteEmail.trim(), role: inviteRole })
      toast.success('Invite sent — check the server console for the link')
      setInviteEmail('')
      setInviteRole('STAFF')
      setInviteOpen(false)
      fetchAll()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function toggleStatus(member: StoreUser) {
    if (member.is_active) {
      // Deactivating — show confirm first
      setDeactivateTarget(member)
      return
    }
    // Reactivating — call API immediately
    try {
      await api.put(`/api/users/${member.id}`, { is_active: true })
      toast.success(`${member.name} activated`)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: true } : m))
    } catch {
      toast.error('Failed to activate user')
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return
    setActionLoading(true)
    try {
      await api.put(`/api/users/${deactivateTarget.id}`, { is_active: false })
      toast.success(`${deactivateTarget.name} deactivated`)
      setMembers(prev => prev.map(m => m.id === deactivateTarget.id ? { ...m, is_active: false } : m))
      setDeactivateTarget(null)
    } catch {
      toast.error('Failed to deactivate user')
    } finally {
      setActionLoading(false)
    }
  }

  async function removeMember() {
    if (!removeTarget) return
    setActionLoading(true)
    try {
      await api.delete(`/api/users/${removeTarget.id}`)
      toast.success(`${removeTarget.name} removed`)
      setMembers(prev => prev.filter(m => m.id !== removeTarget.id))
      setRemoveTarget(null)
    } catch {
      toast.error('Failed to remove user')
    } finally {
      setActionLoading(false)
    }
  }

  async function cancelInvite() {
    if (!cancelTarget) return
    setActionLoading(true)
    try {
      await api.delete(`/api/invite/${cancelTarget.id}`)
      toast.success('Invite cancelled')
      setInvites(prev => prev.filter(i => i.id !== cancelTarget.id))
      setCancelTarget(null)
    } catch {
      toast.error('Failed to cancel invite')
    } finally {
      setActionLoading(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const staffMembers = members.filter(m => m.role === 'STAFF')
  const ownerMembers = members.filter(m => m.role !== 'STAFF')

  return (
    <div className="max-w-4xl space-y-6">

      {/* Invite button */}
      <div className="flex justify-end">
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Invite Staff
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['members', 'invites'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize cursor-pointer ${
              tab === t
                ? 'border-[#6366f1] text-[#6366f1]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'members' ? `Members (${members.length})` : `Pending Invites (${invites.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tab === 'members' ? (

        <div className="space-y-6">
          {/* Store owners/admins — read only */}
          {ownerMembers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Owners</p>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {ownerMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="w-9 h-9 rounded-full bg-[#6366f1]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-[#6366f1]">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    </div>
                    <span className="text-xs font-medium text-[#6366f1] bg-[#6366f1]/10 px-2.5 py-1 rounded-full">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff members */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Staff</p>
            {staffMembers.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 py-12 flex flex-col items-center gap-2 text-gray-400">
                <UserRound className="w-8 h-8" />
                <p className="text-sm font-medium">No staff members yet</p>
                <p className="text-xs">Invite someone to give them access</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {staffMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-600">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    </div>
                    <p className="text-xs text-gray-400 hidden sm:block flex-shrink-0">
                      Joined {formatDate(member.joined_at)}
                    </p>
                    {/* Active / Inactive toggle */}
                    <button
                      onClick={() => toggleStatus(member)}
                      className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 focus:outline-none cursor-pointer ${
                        member.is_active ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                      style={{ height: '22px', width: '40px' }}
                      title={member.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${
                          member.is_active ? 'translate-x-[18px]' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-medium w-16 text-center hidden sm:block flex-shrink-0 ${
                      member.is_active ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => setRemoveTarget(member)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0 cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      ) : (

        // Pending invites tab
        <div>
          {invites.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 py-12 flex flex-col items-center gap-2 text-gray-400">
              <Mail className="w-8 h-8" />
              <p className="text-sm font-medium">No pending invites</p>
              <p className="text-xs">Invited users will appear here until they accept</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
              {invites.map(invite => (
                <div key={invite.id} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{invite.email}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-gray-300" />
                      <p className="text-xs text-gray-400">Expires {formatDate(invite.expires_at)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full flex-shrink-0">
                    Pending
                  </span>
                  <button
                    onClick={() => setCancelTarget(invite)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0 cursor-pointer"
                    title="Cancel invite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite modal */}
      <Dialog open={inviteOpen} onOpenChange={open => { setInviteOpen(open); if (!open) { setInviteEmail(''); setInviteRole('') } }} disablePointerDismissal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email address</Label>
              <Input
                type="email"
                placeholder="staff@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendInvite()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <AppSelect
                value={inviteRole}
                onValueChange={setInviteRole}
                placeholder="Select a role"
                options={INVITE_ROLES.map(r => ({ value: r.value, label: r.label }))}
              />
            </div>
            <p className="text-xs text-gray-400">
              The invite link will appear in the server console.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={sendInvite} disabled={inviting || !inviteEmail.trim() || !inviteRole}>
              {inviting ? 'Sending…' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove member confirm */}
      <AlertDialog open={!!removeTarget} onOpenChange={open => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to your store immediately. You can invite them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={removeMember}
              disabled={actionLoading}
            >
              {actionLoading ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel invite confirm */}
      <AlertDialog open={!!cancelTarget} onOpenChange={open => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invite?</AlertDialogTitle>
            <AlertDialogDescription>
              The invite sent to <span className="font-semibold">{cancelTarget?.email}</span> will be cancelled and the link will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={cancelInvite}
              disabled={actionLoading}
            >
              {actionLoading ? 'Cancelling…' : 'Cancel Invite'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate member confirm */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={open => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will no longer be able to log in to the store. You can reactivate them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={confirmDeactivate}
              disabled={actionLoading}
            >
              {actionLoading ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
