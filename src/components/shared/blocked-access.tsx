import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertTriangle, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BlockedAccessProps {
  reason?: string
  showContactInfo?: boolean
}

export function BlockedAccess({ reason, showContactInfo = true }: BlockedAccessProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-red-800">
            Access Blocked
          </CardTitle>
          <CardDescription>
            Your access has been temporarily restricted
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {reason || 'Suspicious activity detected from your network'}
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 text-blue-500" />
              <div>
                <div className="font-medium text-foreground">Why was I blocked?</div>
                <div>Our security system detected unusual patterns that may indicate automated or malicious activity.</div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 text-green-500" />
              <div>
                <div className="font-medium text-foreground">How to resolve this?</div>
                <div>Most blocks are temporary and will be automatically lifted within 24 hours. If you believe this is an error, please contact support.</div>
              </div>
            </div>
          </div>

          {showContactInfo && (
            <div className="pt-4 border-t">
              <div className="text-sm text-center text-muted-foreground">
                Need help? Contact us at{' '}
                <a 
                  href="mailto:support@devprojects.ai" 
                  className="text-blue-600 hover:underline"
                >
                  support@devprojects.ai
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 