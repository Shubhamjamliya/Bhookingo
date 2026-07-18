export const PERMISSION_REGISTRY = {
  dashboard: {
    label: "Dashboard",
    actions: ["view"]
  },
  orders: {
    label: "Orders",
    actions: ["view", "create", "edit", "cancel", "refund", "export"]
  },
  restaurants: {
    label: "Restaurants",
    actions: ["view", "approve", "reject", "edit", "suspend", "reviews", "withdrawals"]
  },
  users: {
    label: "Users",
    actions: ["view", "edit", "suspend", "delete"]
  },
  reports: {
    label: "Reports",
    actions: ["view", "export"]
  },
  coupons: {
    label: "Coupons",
    actions: ["view", "create", "edit", "delete"]
  },
  notifications: {
    label: "Notifications",
    actions: ["view", "send"]
  },
  settings: {
    label: "Settings",
    actions: ["view", "edit"]
  },
  subAdmins: {
    label: "Sub-Admins",
    actions: ["view", "create", "edit", "delete", "reset_password"]
  }
};
