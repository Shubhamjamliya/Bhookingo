import { Link, useNavigate, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { ArrowLeft, XCircle, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Button } from "@food/components/ui/button"
import api from "@food/api"
import useAppBackNavigation from "@food/hooks/useAppBackNavigation"
import { API_ENDPOINTS } from "@food/api/config"

export default function Cancellation() {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = useAppBackNavigation()
  const [loading, setLoading] = useState(true)
  const [cancellationData, setCancellationData] = useState({
    title: 'Cancellation Policy',
    content: ''
  })

  useEffect(() => {
    fetchCancellationData()
  }, [])

  const fetchCancellationData = async () => {
    try {
      setLoading(true)
      const response = await api.get(API_ENDPOINTS.ADMIN.CANCELLATION_PUBLIC)
      if (response.data.success) {
        setCancellationData(response.data.data || { title: 'Cancellation Policy', content: '' })
      }
    } catch (error) {
      console.error('Error fetching cancellation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo, { 
        state: location.state?.originalState,
        replace: true 
      })
    } else if (window.history.length > 2) {
      goBack()
    } else {
      navigate('/food/user')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface dark:bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
          <p className="text-text-secondary font-bold uppercase tracking-widest text-xs">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AnimatedPage className="min-h-screen bg-surface dark:bg-[#0a0a0a] pb-10">
      {/* Premium Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-border dark:border-gray-900">
        <div className="max-w-4xl mx-auto px-4 h-16 md:h-20 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-all active:scale-95"
          >
            <ArrowLeft className="h-6 w-6 text-text-primary dark:text-white" />
          </Button>
          <div className="flex-1">
             <h1 className="text-xl md:text-2xl font-black text-text-primary dark:text-white tracking-tight leading-none">
               {cancellationData.title || "Cancellation Policy"}
             </h1>
             <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">Bhookingo Ecosystem</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface dark:bg-[#111] rounded-[2rem] p-6 md:p-10 shadow-sm border border-gray-50 dark:border-gray-900"
        >
          {cancellationData.content ? (
            <div
              className="prose prose-slate dark:prose-invert max-w-none
                prose-headings:font-black prose-headings:text-text-primary dark:prose-headings:text-white
                prose-p:text-text-secondary dark:prose-p:text-text-secondary prose-p:leading-relaxed
                prose-strong:text-text-primary dark:prose-strong:text-white
                prose-a:text-[var(--primary)] dark:prose-a:text-[var(--primary)]
                prose-li:text-text-secondary dark:prose-li:text-text-secondary"
              dangerouslySetInnerHTML={{ __html: cancellationData.content }}
            />
          ) : (
            <div className="text-center py-20">
               <XCircle className="w-16 h-16 text-gray-100 dark:text-gray-800 mx-auto mb-4" />
               <p className="text-text-secondary font-medium">No content available at the moment.</p>
            </div>
          )}
        </motion.div>

        <p className="text-center mt-10 text-[10px] text-text-secondary font-black uppercase tracking-[0.2em] leading-relaxed">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} <br />
          © {new Date().getFullYear()} Bhookingo. All Rights Reserved.
        </p>
      </div>
    </AnimatedPage>
  )
}


