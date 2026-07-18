import React, { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import {
  Users,
  UserPlus,
  Shield,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit2,
  Trash2,
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Loader2,
  UserCheck,
  UserMinus,
  RefreshCw,
  FileSpreadsheet,
  Globe,
  Plus
} from "lucide-react"
import { Card, CardContent } from "@food/components/ui/card"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Textarea } from "@food/components/ui/textarea"
import { adminAPI } from "@food/api"
import { PERMISSION_REGISTRY } from "../../../../config/permissions.registry"

export default function SubAdmins() {
  const [subAdmins, setSubAdmins] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("list") // "list" | "audit"
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  // Audit Search
  const [auditSearch, setAuditSearch] = useState("")

  // Bulk operation selections
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Modal / Drawer states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState("create") // "create" | "edit" | "view"
  const [editingId, setEditingId] = useState(null)
  
  // Form values
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [roleTitle, setRoleTitle] = useState("")
  const [profileImage, setProfileImage] = useState("")
  const [status, setStatus] = useState("active")
  const [notes, setNotes] = useState("")
  const [permissions, setPermissions] = useState({})

  // Expanded permission cards in drawer
  const [expandedModules, setExpandedModules] = useState({})

  // Reset password states
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resettingId, setResettingId] = useState(null)
  const [tempPassword, setTempPassword] = useState("")

  // Fetch Sub-Admins list
  const loadSubAdmins = async () => {
    try {
      setLoading(true)
      const params = {
        search: searchQuery || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        roleTitle: roleFilter !== "all" ? roleFilter : undefined,
        sortBy,
        sortOrder,
        page,
        limit: itemsPerPage
      }
      const response = await adminAPI.listSubAdmins(params)
      if (response?.data?.success && response.data.data) {
        setSubAdmins(response.data.data.subAdmins || [])
        setTotalItems(response.data.data.total || 0)
      }
    } catch (err) {
      console.error("Error loading sub-admins:", err)
      toast.error(err.response?.data?.message || "Failed to load sub-admins list")
    } finally {
      setLoading(false)
    }
  }

  // Fetch Audit Logs
  const loadAuditLogs = async () => {
    try {
      const params = {
        search: auditSearch || undefined,
        limit: 100
      }
      const response = await adminAPI.listSubAdminAuditLogs(params)
      if (response?.data?.success && response.data.data) {
        setAuditLogs(response.data.data.auditLogs || [])
      }
    } catch (err) {
      console.error("Error loading audit logs:", err)
    }
  }

  useEffect(() => {
    if (activeTab === "list") {
      loadSubAdmins()
    } else {
      loadAuditLogs()
    }
  }, [activeTab, searchQuery, statusFilter, roleFilter, sortBy, sortOrder, page, auditSearch])

  // Reset Form states
  const resetForm = () => {
    setFirstName("")
    setLastName("")
    setEmail("")
    setPhone("")
    setPassword("")
    setConfirmPassword("")
    setRoleTitle("")
    setProfileImage("")
    setStatus("active")
    setNotes("")
    setPermissions({})
    setEditingId(null)
    setExpandedModules({})
  }

  // Open create form
  const handleOpenCreate = () => {
    resetForm()
    setFormMode("create")
    setIsFormOpen(true)
  }

  // Open edit form
  const handleOpenEdit = async (subAdmin, mode = "edit") => {
    resetForm()
    setFormMode(mode)
    setEditingId(subAdmin._id)
    setFirstName(subAdmin.firstName || "")
    setLastName(subAdmin.lastName || "")
    setEmail(subAdmin.email || "")
    setPhone(subAdmin.phone || "")
    setRoleTitle(subAdmin.roleTitle || "")
    setProfileImage(subAdmin.profileImage || "")
    setStatus(subAdmin.status || "active")
    setNotes(subAdmin.notes || "")
    setPermissions(subAdmin.permissions || {})
    setIsFormOpen(true)
  }

  // Delete/Soft delete sub admin
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Sub-Admin account? (Their account will be deactivated and marked deleted to preserve history)")) {
      return
    }
    try {
      const response = await adminAPI.deleteSubAdmin(id)
      if (response?.data?.success) {
        toast.success("Sub-Admin deleted successfully")
        loadSubAdmins()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete sub-admin")
    }
  }

  // Save/Update handler
  const handleSave = async (e) => {
    e.preventDefault()

    if (formMode === "create") {
      if (!password) {
        toast.error("Password is required")
        return
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match")
        return
      }
    }

    const payload = {
      firstName,
      lastName,
      email,
      phone,
      roleTitle,
      profileImage,
      status,
      notes,
      permissions
    }

    if (password) {
      payload.password = password
    }

    try {
      let response
      if (formMode === "create") {
        response = await adminAPI.createSubAdmin(payload)
      } else {
        response = await adminAPI.updateSubAdmin(editingId, payload)
      }

      if (response?.data?.success) {
        toast.success(`Sub-Admin ${formMode === "create" ? "created" : "updated"} successfully`)
        setIsFormOpen(false)
        loadSubAdmins()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save sub-admin details")
    }
  }

  // Reset password handler
  const handleResetPassword = async () => {
    if (!tempPassword) {
      toast.error("Please enter a new password")
      return
    }
    try {
      const response = await adminAPI.resetSubAdminPassword(resettingId, tempPassword)
      if (response?.data?.success) {
        toast.success("Password reset successfully")
        setIsResetOpen(false)
        setTempPassword("")
        setResettingId(null)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password")
    }
  }

  // Toggle individual permission action
  const togglePermission = (moduleKey, action) => {
    setPermissions(prev => {
      const modObj = prev[moduleKey] || {}
      const newVal = !modObj[action]
      
      const newModObj = { ...modObj, [action]: newVal }
      
      // If the action is not view, but is set to true, automatically set view permission to true
      if (action !== 'view' && newVal === true) {
        newModObj.view = true
      }
      
      return {
        ...prev,
        [moduleKey]: newModObj
      }
    })
  }

  // Toggle entire module view permission
  const toggleModuleAll = (moduleKey) => {
    const isModuleEnabled = permissions[moduleKey]?.view === true
    setPermissions(prev => {
      const actionsList = PERMISSION_REGISTRY[moduleKey]?.actions || []
      const newModObj = {}
      
      actionsList.forEach(action => {
        newModObj[action] = !isModuleEnabled
      })
      
      return {
        ...prev,
        [moduleKey]: newModObj
      }
    })
  }

  // Bulk Operations Handlers
  const handleSelectRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(subAdmins.map(s => s._id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Update status of ${selectedIds.size} sub-admins to ${newStatus}?`)) return
    
    let successCount = 0
    for (const id of selectedIds) {
      try {
        await adminAPI.updateSubAdmin(id, { status: newStatus })
        successCount++
      } catch (err) {
        console.error(`Failed to update ${id}:`, err)
      }
    }
    toast.success(`Updated status for ${successCount} sub-admins successfully`)
    setSelectedIds(new Set())
    loadSubAdmins()
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Soft delete ${selectedIds.size} sub-admins?`)) return
    
    let successCount = 0
    for (const id of selectedIds) {
      try {
        await adminAPI.deleteSubAdmin(id)
        successCount++
      } catch (err) {
        console.error(`Failed to delete ${id}:`, err)
      }
    }
    toast.success(`Soft-deleted ${successCount} sub-admins successfully`)
    setSelectedIds(new Set())
    loadSubAdmins()
  }

  const uniqueRoles = useMemo(() => {
    const roles = subAdmins.map(s => s.roleTitle).filter(Boolean)
    return Array.from(new Set(roles))
  }, [subAdmins])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left">
      {/* Header section with glassmorphism styling */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#121212] p-6 rounded-3xl border border-gray-150 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-rose-500 fill-rose-500/10" />
            Sub-Admin Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Configure sub-admins, roles, and module-level permissions for access control.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setActiveTab(activeTab === "list" ? "audit" : "list")}
            variant="outline"
            className="flex items-center gap-2 border-slate-200"
          >
            {activeTab === "list" ? "View Audit Logs" : "View Sub-Admins"}
          </Button>
          {activeTab === "list" && (
            <Button
              onClick={handleOpenCreate}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2 rounded-xl"
            >
              <UserPlus className="w-4 h-4" />
              Add Sub-Admin
            </Button>
          )}
        </div>
      </div>

      {activeTab === "list" ? (
        <>
          {/* Filters Bar */}
          <Card className="rounded-3xl border border-gray-150 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-[#121212]">
            <CardContent className="p-5 flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search sub-admins by name, email, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl border-slate-200"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Role Title Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Operations Indicator */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/50 p-4 rounded-2xl animate-in fade-in duration-200">
              <span className="text-sm font-bold text-rose-700 dark:text-rose-400">
                {selectedIds.size} sub-admins selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleBulkStatusUpdate("active")}
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 bg-white hover:bg-green-50"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Activate
                </Button>
                <Button
                  onClick={() => handleBulkStatusUpdate("inactive")}
                  variant="outline"
                  size="sm"
                  className="text-amber-600 border-amber-200 bg-white hover:bg-amber-50"
                >
                  <UserMinus className="w-3.5 h-3.5 mr-1" />
                  Deactivate
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 bg-white hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold ml-2"
                >
                  Cancel Selection
                </button>
              </div>
            </div>
          )}

          {/* Sub-Admins Table Card */}
          <Card className="rounded-3xl border border-gray-150 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-[#121212]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#1a1a1a] border-b border-gray-150 dark:border-gray-800">
                    <th className="px-5 py-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={subAdmins.length > 0 && selectedIds.size === subAdmins.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded accent-rose-600 cursor-pointer w-4 h-4"
                      />
                    </th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Avatar</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role Title</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Modules</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Login</th>
                    <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-gray-850">
                  {loading && subAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-20 text-center">
                        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-2" />
                        <span className="text-slate-500 font-semibold">Loading Sub-Admins list...</span>
                      </td>
                    </tr>
                  ) : subAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-20 text-center text-slate-500 font-medium">
                        No Sub-Admins found. Click "Add Sub-Admin" to create one.
                      </td>
                    </tr>
                  ) : (
                    subAdmins.map((subAdmin) => {
                      // Compute enabled modules
                      const enabledMods = Object.keys(PERMISSION_REGISTRY).filter(
                        key => subAdmin.permissions?.[key]?.view === true
                      ).map(key => PERMISSION_REGISTRY[key].label)

                      return (
                        <tr key={subAdmin._id} className="hover:bg-slate-50/50 dark:hover:bg-gray-850/20 transition-colors">
                          <td className="px-5 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(subAdmin._id)}
                              onChange={() => handleSelectRow(subAdmin._id)}
                              className="rounded accent-rose-600 cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <img
                              src={subAdmin.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(subAdmin.name || 'Sub Admin')}&background=random`}
                              alt={subAdmin.name}
                              className="w-10 h-10 rounded-full border border-slate-100 object-cover"
                              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(subAdmin.name)}`; }}
                            />
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap font-bold text-slate-800 dark:text-gray-250">
                            {subAdmin.name}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-gray-400">
                            {subAdmin.email}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap font-semibold text-slate-700 dark:text-gray-300">
                            {subAdmin.roleTitle || "N/A"}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                              subAdmin.status === "active"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : subAdmin.status === "suspended"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>
                              {subAdmin.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {enabledMods.length === 0 ? (
                                <span className="text-xs text-slate-400">No access</span>
                              ) : enabledMods.length > 3 ? (
                                <>
                                  {enabledMods.slice(0, 2).map((m, i) => (
                                    <span key={i} className="text-[10px] bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-semibold">{m}</span>
                                  ))}
                                  <span className="text-[10px] bg-slate-200 dark:bg-gray-700 px-1.5 py-0.5 rounded font-bold">+{enabledMods.length - 2} more</span>
                                </>
                              ) : (
                                enabledMods.map((m, i) => (
                                  <span key={i} className="text-[10px] bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-semibold">{m}</span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                            {subAdmin.lastLogin
                              ? new Date(subAdmin.lastLogin).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                              : 'Never'}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(subAdmin, "view")}
                                title="View details"
                                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(subAdmin, "edit")}
                                title="Edit Sub-Admin"
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setResettingId(subAdmin._id)
                                  setIsResetOpen(true)
                                }}
                                title="Reset Password"
                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(subAdmin._id)}
                                title="Delete Sub-Admin"
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalItems > itemsPerPage && (
              <div className="p-4 flex items-center justify-between border-t border-gray-150 dark:border-gray-800 bg-slate-50/50 dark:bg-[#121212]">
                <span className="text-xs text-slate-500">
                  Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, totalItems)} of {totalItems} sub-admins
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    variant="outline"
                    size="sm"
                    className="border-slate-200"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * itemsPerPage >= totalItems}
                    variant="outline"
                    size="sm"
                    className="border-slate-200"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      ) : (
        /* Audit Logs Panel */
        <Card className="rounded-3xl border border-gray-150 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-[#121212]">
          <CardContent className="p-5 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search audit logs..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="pl-9 rounded-xl border-slate-200"
              />
            </div>
            <button
              onClick={loadAuditLogs}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#1a1a1a] border-b border-gray-150 dark:border-gray-800">
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Admin</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Target</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-850">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-medium">
                      No audit logs generated yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-gray-850/20 transition-colors text-sm">
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-semibold text-slate-700 dark:text-gray-300">
                        {log.adminEmail}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          log.action === 'SUB_ADMIN_CREATED' ? 'bg-green-50 text-green-700 border border-green-100' :
                          log.action === 'SUB_ADMIN_DELETED' ? 'bg-red-50 text-red-700 border border-red-100' :
                          'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-600">
                        {log.targetUser || 'N/A'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {log.ip || '127.0.0.1'}
                      </td>
                      <td className="px-5 py-4 max-w-sm truncate text-xs text-slate-600" title={log.details || JSON.stringify(log.newValue)}>
                        {log.details || `Admin properties modified.`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Drawer / Form Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-xs font-sans">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121212] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden text-left">
            {/* Header */}
            <div className="p-6 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-500" />
                {formMode === "create" ? "Add New Sub-Admin" : formMode === "edit" ? "Edit Sub-Admin" : "View Sub-Admin Details"}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-2"
              >
                <span className="text-xl font-bold">x</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* General Details Group */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-rose-500 tracking-wider uppercase">General Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">First Name</span>
                    <Input
                      required
                      disabled={formMode === "view"}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Prince"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Last Name</span>
                    <Input
                      required
                      disabled={formMode === "view"}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Bangar"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Email Address</span>
                    <Input
                      required
                      type="email"
                      disabled={formMode !== "create"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. support@bhookingo.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Phone Number</span>
                    <Input
                      disabled={formMode === "view"}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 9999999999"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Role Title</span>
                    <select
                      disabled={formMode === "view"}
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      className="w-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                    >
                      <option value="">Select Role Type</option>
                      <option value="Operations Manager">Operations Manager</option>
                      <option value="Customer Support">Customer Support</option>
                      <option value="Finance Manager">Finance Manager</option>
                      <option value="Restaurant Manager">Restaurant Manager</option>
                      <option value="Reports Manager">Reports Manager</option>
                      <option value="City Manager">City Manager</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Status</span>
                    <select
                      disabled={formMode === "view"}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                {/* Password fields only on create */}
                {formMode === "create" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-500">Password</span>
                      <Input
                        required
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-500">Confirm Password</span>
                      <Input
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500">Profile Image URL (Optional)</span>
                  <Input
                    disabled={formMode === "view"}
                    value={profileImage}
                    onChange={(e) => setProfileImage(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500">Notes (Optional)</span>
                  <Textarea
                    disabled={formMode === "view"}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal admin reference notes..."
                    rows={2}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Permissions Section */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-black text-rose-500 tracking-wider uppercase">Module & Action Permissions</h3>
                
                <div className="space-y-3">
                  {Object.keys(PERMISSION_REGISTRY).map((moduleKey) => {
                    const registryInfo = PERMISSION_REGISTRY[moduleKey]
                    const actions = registryInfo.actions
                    const isModuleEnabled = permissions[moduleKey]?.view === true
                    const isExpanded = expandedModules[moduleKey] || false

                    return (
                      <div
                        key={moduleKey}
                        className="border border-slate-100 dark:border-gray-850 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-[#181818]"
                      >
                        {/* Module Card Header */}
                        <div className="p-4 flex items-center justify-between bg-slate-50/60 dark:bg-[#1c1c1c] border-b border-slate-100 dark:border-gray-850">
                          <label className="flex items-center gap-2.5 font-bold text-slate-800 dark:text-gray-250 text-sm cursor-pointer select-none">
                            <input
                              type="checkbox"
                              disabled={formMode === "view"}
                              checked={isModuleEnabled}
                              onChange={() => toggleModuleAll(moduleKey)}
                              className="rounded accent-rose-600 cursor-pointer w-4.5 h-4.5"
                            />
                            {registryInfo.label}
                          </label>

                          <button
                            type="button"
                            onClick={() => setExpandedModules(prev => ({ ...prev, [moduleKey]: !isExpanded }))}
                            className="p-1 hover:bg-slate-200/50 rounded-full transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                          </button>
                        </div>

                        {/* Collapsible Action Checkboxes */}
                        {isExpanded && (
                          <div className="p-4 bg-white dark:bg-[#181818] grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {actions.map((action) => {
                              const isChecked = permissions[moduleKey]?.[action] === true
                              return (
                                <label
                                  key={action}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold select-none border transition-all cursor-pointer ${
                                    isChecked
                                      ? "bg-rose-50/50 border-rose-100 text-rose-700 dark:bg-rose-950/10 dark:border-rose-950/40"
                                      : "border-slate-100 text-slate-600 hover:bg-slate-50 dark:border-gray-850"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={formMode === "view"}
                                    checked={isChecked}
                                    onChange={() => togglePermission(moduleKey, action)}
                                    className="rounded accent-rose-600 w-3.5 h-3.5"
                                  />
                                  <span className="capitalize">{action.replace(/_/g, ' ')}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              {formMode !== "view" && (
                <div className="pt-4 flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 rounded-xl shadow-md border-none"
                  >
                    {formMode === "create" ? "Save Sub-Admin" : "Update Profile"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFormOpen(false)}
                    className="border-slate-200 text-slate-600 h-12 rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Dialog */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#121212] shadow-2xl p-6 border border-gray-150 dark:border-gray-800 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-amber-500" />
              Reset Password
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Enter a new temporary password for this sub-admin. They will use this password on their next login.
            </p>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Temporary Password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="rounded-xl border-slate-200"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleResetPassword}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl border-none"
                >
                  Confirm Reset
                </Button>
                <Button
                  onClick={() => {
                    setIsResetOpen(false)
                    setTempPassword("")
                    setResettingId(null)
                  }}
                  variant="outline"
                  className="border-slate-200 rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
