import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@food/api";
import { Input } from "@food/components/ui/input";
import { Mail, Phone, Loader2, Save } from "lucide-react";

export default function ContactInfoCMS() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [contactData, setContactData] = useState({
    title: "Contact Info",
    email: "",
    mobile: ""
  });
  
  const [initialData, setInitialData] = useState({
    title: "Contact Info",
    email: "",
    mobile: ""
  });

  const hasChanges = JSON.stringify(contactData) !== JSON.stringify(initialData);

  useEffect(() => {
    fetchContactData();
  }, []);

  const fetchContactData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/food/admin/pages-social-media/contact`, {
        contextModule: "admin",
      });

      if (response.data.success && response.data.data) {
        const raw = response.data.data;
        const newData = {
          title: raw.title || "Contact Info",
          email: raw.email || "",
          mobile: raw.mobile || ""
        };
        setContactData(newData);
        setInitialData(newData);
      } else {
        const emptyData = { title: "Contact Info", email: "", mobile: "" };
        setContactData(emptyData);
        setInitialData(emptyData);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        const emptyData = { title: "Contact Info", email: "", mobile: "" };
        setContactData(emptyData);
        setInitialData(emptyData);
      } else {
        toast.error("Failed to load contact info");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!contactData.email.toLowerCase().endsWith("@gmail.com")) {
      toast.error("Email address must be a valid @gmail.com address");
      return;
    }
    
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(contactData.mobile.replace(/\s/g, ""))) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    try {
      setSaving(true);
      const response = await api.put(
        `/food/admin/pages-social-media/contact`,
        {
          title: contactData.title,
          email: contactData.email,
          mobile: contactData.mobile,
          content: "Contact information for public pages",
          faq: ""
        },
        { contextModule: "admin" }
      );

      if (response.data.success) {
        toast.success("Contact info updated successfully");
        const raw = response.data.data;
        const savedData = {
          title: raw.title || "Contact Info",
          email: raw.email || "",
          mobile: raw.mobile || ""
        };
        setContactData(savedData);
        setInitialData(savedData);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save contact info");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#CB202D]" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Landing Page Support</h1>
        <p className="text-slate-600 text-sm mt-1">
          Update the email and phone number displayed in the footer of the public landing page.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none flex items-center gap-2 text-slate-700">
                <Mail className="h-4 w-4 text-slate-500" />
                Public Support Email
              </label>
              <Input
                placeholder="e.g. support@bhookingo.com"
                value={contactData.email}
                onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                className="max-w-md placeholder:text-slate-400 text-slate-800"
              />
              <p className="text-xs text-slate-500">
                This email address will be visible in the footer of the landing page.
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none flex items-center gap-2 mt-4 text-slate-700">
                <Phone className="h-4 w-4 text-slate-500" />
                Public Support Phone
              </label>
              <Input
                placeholder="e.g. 9999999999"
                value={contactData.mobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 10) {
                    setContactData({ ...contactData, mobile: val });
                  }
                }}
                maxLength={10}
                className="max-w-md placeholder:text-slate-400 text-slate-800"
              />
              <p className="text-xs text-slate-500">
                This phone number will be visible in the footer of the landing page.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#CB202D] text-white hover:bg-[#b01c27] h-10 px-4 py-2"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
