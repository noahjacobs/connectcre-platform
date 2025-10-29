"use client"

import { useEffect, useState } from "react"
import { Icon } from "@iconify/react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/providers/auth-context"
import { useSupabase } from "@/lib/providers/supabase-context"
import {
  PopoverForm,
  PopoverFormButton,
  PopoverFormCutOutLeftIcon,
  PopoverFormCutOutRightIcon,
  PopoverFormSeparator,
  PopoverFormSuccess,
} from "@/components/ui/popover-form"
import { AuthModal } from "@/components/ui/auth-modal"

type FormState = "idle" | "loading" | "success"
type EmojiRating = "bad" | "neutral" | "good" | "great"

interface FeedbackFormProps {
  title?: string
}

export function FeedbackForm({ title = "Feedback" }: FeedbackFormProps) {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const [formState, setFormState] = useState<FormState>("idle")
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiRating>("good")
  // const [isMounted, setIsMounted] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setIsMounted(true)
  //   }, 100)

  //   return () => {
  //     clearTimeout(timer)
  //   }
  // }, [])

  async function submit() {
    try {
      setFormState("loading")
      
      if (!user) {
        setShowAuthModal(true)
        setFormState("idle")
        setOpen(false)
        return
      }
      
      // Prepare feedback data
      const feedbackData = {
        feedback,
        emoji_rating: selectedEmoji,
        ...(user && {
          user_id: user.id,
          user_name: user.full_name,
          user_email: user.email
        })
      }

      // Submit to Supabase
      if (!supabase) {
        console.error('Authentication required')
        return
      }
      
      const { error } = await supabase
        .from('feedback')
        .insert([feedbackData])

      if (error) {
        console.error('Error submitting feedback:', error)
        return
      }

      // Send email notification
      try {
        await fetch('/api/send-feedback-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'feedback',
            record: feedbackData
          })
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't throw here - we still want to show success even if email fails
      }

      setFormState("success")
      
      // Reset form after success
      setTimeout(() => {
        setOpen(false)
        setFormState("idle")
        setFeedback("")
        setSelectedEmoji("good")
      }, 1800)
    } catch (error) {
      console.error('Error in submit:', error)
      setFormState("idle")
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter" &&
        open &&
        formState === "idle"
      ) {
        submit()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, formState])

  const emojis: { value: EmojiRating; icon: string; label: string; color: string }[] = [
    { 
      value: "bad", 
      icon: "fluent-mdl2:emoji-disappointed", 
      label: "Bad",
      color: "text-red-500"
    },
    { 
      value: "neutral", 
      icon: "fluent-mdl2:emoji-neutral", 
      label: "Neutral",
      color: "text-foreground"
    },
    { 
      value: "good", 
      icon: "fluent-mdl2:emoji-2", 
      label: "Good",
      color: "text-blue-500"
    },
    { 
      value: "great", 
      icon: "fluent-mdl2:emoji", 
      label: "Great",
      color: "text-green-500"
    },
  ]

  return (
    <div id="tour-feedback" className="flex w-full items-center justify-center">
      {/* {isMounted && ( */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <PopoverForm
            title={title}
            open={open}
            setOpen={setOpen}
            width="364px"
            height="192px"
            showCloseButton={formState !== "success"}
            showSuccess={formState === "success"}
            openChild={
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!feedback) return
                  submit()
                }}
                className=""
              >
                <div className="relative">
                  <textarea
                    autoFocus
                    placeholder="Your feedback..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="h-32 w-full resize-none rounded-t-lg p-3 text-base outline-none"
                    required
                  />
                </div>
                <div className="relative flex h-12 items-center px-[10px]">
                  <PopoverFormSeparator />
                  <div className="absolute left-0 top-0 -translate-x-[1.5px] -translate-y-1/2">
                    <PopoverFormCutOutLeftIcon />
                  </div>
                  <div className="absolute right-0 top-0 translate-x-[1.5px] -translate-y-1/2 rotate-180">
                    <PopoverFormCutOutRightIcon />
                  </div>
                  <div className="flex items-center gap-1">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji.value}
                        type="button"
                        onClick={() => setSelectedEmoji(emoji.value)}
                        className="p-1.5 rounded-full hover:bg-muted-foreground/10"
                        title={emoji.label}
                      >
                        <div className="transform transition-transform">
                          <Icon 
                            icon={emoji.icon} 
                            className={`transition-colors ${
                              selectedEmoji === emoji.value ? emoji.color : "text-zinc-400"
                            }`}
                            width={20}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                  <PopoverFormButton
                    loading={formState === "loading"}
                    text="Send"
                  />
                </div>
              </form>
            }
            successChild={
              <PopoverFormSuccess
                title="Feedback Received"
                description="Thank you for supporting DevProjects!"
              />
            }
          />
        </motion.div>
      {/* )} */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
        returnTo={`/`}
      />
    </div>
  )
}