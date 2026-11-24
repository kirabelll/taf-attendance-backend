import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { apiService } from "@/lib/api";
import { User as UserType, RoleInfo } from "@/lib/api";
import {
  Plus, Search, Edit, Trash2, Shield, User, Mail, Phone,
  Building2, Settings, Loader2, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, MoreVertical, X, Save, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast, Toaster } from "sonner";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  hr: "bg-green-100 text-green-800 border-green-200",
  employee: "bg-gray-100 text-gray-800 border-gray-200",
  viewer: "bg-slate-100 text-slate-800 border-slate-200",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  hr: "HR",
  employee: "Employee",
  viewer: "Viewer",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge className={ROLE_COLORS[role] || ROLE_COLORS.employee} variant="outline">
      {ROLE_LABELS[role] || role}
    </Badge>
  );
}

function UserRow({ user, onEdit, onDelete, canManage }: {
  user: UserType;
  onEdit: (user: UserType) => void;
  onDelete: (user: UserType) => void;
  canManage: boolean;
}) {
  if (!canManage) return null;

  return (
    <TableRow>
      <TableCell className="font-medium">{user.full_name || user.email}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell><RoleBadge role={user.role} /></TableCell>
      <TableCell>{user.department || "-"}</TableCell>
      <TableCell>{user.position || "-"}</TableCell>
      <TableCell>
        <Badge variant={user.is_active ? "success" : "destructive"} className="text-xs">
          {user.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(user)} title="Edit user">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(user)} title="Delete user" className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    department: "",
    position: "",
    phone: "",
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<RoleInfo[]>([]);
  const [manageableRoles, setManageableRoles] = useState<string[]>([]);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.listUsers();
      if (response.success) {
        setUsers(response.users);
      }
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await apiService.getRoles();
      if (response.success) {
        setAvailableRoles(response.all_roles);
        setManageableRoles(response.manageable_roles);
      }
    } catch (error) {
      console.error("Failed to load roles:", error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(search.toLowerCase()) ||
                         user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "employee",
      department: "",
      position: "",
      phone: "",
      is_active: true,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
      department: user.department,
      position: user.position,
      phone: user.phone,
      is_active: user.is_active ?? true,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setDeleteConfirm(user);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiService.deleteUser(deleteConfirm.id);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
    setDeleteConfirm(null);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Invalid email format";
    if (!editingUser && !formData.password) errors.password = "Password is required";
    if (formData.password && formData.password.length < 8) errors.password = "Password must be at least 8 characters";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingUser) {
        await apiService.updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          position: formData.position,
          phone: formData.phone,
          is_active: formData.is_active,
        });
        toast.success("User updated successfully");
      } else {
        await apiService.createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          department: formData.department,
          position: formData.position,
          phone: formData.phone,
        });
        toast.success("User created successfully");
      }
      fetchUsers();
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const canManageRole = (role: string) => manageableRoles.includes(role);
  const canManageUser = (user: User) => canManageRole(user.role);

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage user accounts, roles, and permissions</p>
          </div>
          <Button onClick={handleOpenCreate} className="bg-primary text-primary-foreground shadow-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Filters */}
        <div className="stat-card flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {availableRoles.map(role => (
                <SelectItem key={role.role} value={role.role}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="stat-card">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search || roleFilter !== "all" ? "Try adjusting your filters" : "Click 'Add User' to create the first user"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <UserRow
                        key={user.id}
                        user={user}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        canManage={canManageUser(user)}
                      />
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground text-sm">
                        Showing {filteredUsers.length} of {users.length} users
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </>
          )}
        </div>

        {/* Permissions Reference */}
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Role Permissions Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {availableRoles.map(role => (
              <div key={role.role} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <RoleBadge role={role.role} />
                  {role.role === 'admin' && <span className="text-xs text-muted-foreground">(Full Access)</span>}
                </div>
                <p className="text-muted-foreground">Level: {role.level}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user information and role. Leave password blank to keep current."
                : "Create a new user account with the appropriate role and permissions."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="h-10"
                placeholder="John Doe"
                error={formErrors.name}
              />
              {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="h-10"
                placeholder="john@company.com"
                disabled={!!editingUser}
                error={formErrors.email}
              />
              {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
              {editingUser && <p className="text-xs text-muted-foreground">Email cannot be changed for existing users</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                {editingUser ? "New Password (optional)" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="h-10"
                placeholder={editingUser ? "Leave blank to keep current" : "Min 8 characters"}
                error={formErrors.password}
              />
              {formErrors.password && <p className="text-sm text-destructive">{formErrors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium text-foreground">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({...formData, role: value})}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles
                    .filter(r => canManageRole(r.role))
                    .map(role => (
                      <SelectItem key={role.role} value={role.role}>
                        {role.label} (Level {role.level})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department" className="text-sm font-medium text-foreground">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="h-10"
                  placeholder="Engineering"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position" className="text-sm font-medium text-foreground">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  className="h-10"
                  placeholder="Software Engineer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="h-10"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            {editingUser && (
              <div className="flex items-center space-x-3 pt-2 border-t border-border">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer">
                  Active User
                </Label>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingUser ? "Update User" : "Create User"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.full_name || deleteConfirm?.email}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </AppLayout>
  );
}