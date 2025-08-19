import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Paintbrush,
  Clock,
  MessageSquare,
  Upload,
  ArrowLeft,
  Sparkles,
  FileVideo,
  CheckCircle,
} from "lucide-react";

interface EditorWorkingScreenProps {
  project: any;
  onBack: () => void;
}

export function EditorWorkingScreen({
  project,
  onBack,
}: EditorWorkingScreenProps) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-500/20 rounded-full">
          <Paintbrush className="w-10 h-10 text-cyan-500 animate-pulse" />
        </div>
        <h1 className="text-4xl font-bold text-white">Editor is On It! 🎬</h1>
        <p className="text-xl text-gray-300">
          Your revision request has been received and paid for
        </p>
      </div>

      {/* Status Card */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/20">
        <CardContent className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Payment Confirmed
              </h2>
              <p className="text-gray-400">
                $5.00 revision fee has been processed
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                What happens next?
              </h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>
                    The editor will review all your Frame.io comments and
                    highlights
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>They'll make the requested changes to your video</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>
                    You'll receive an email when the revised video is ready
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>
                    Video will be posted in Step 4 and you will be able to
                    review the new version
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Timeline
              </h3>
              <p className="text-gray-300 text-sm">
                Revisions typically take <strong>24-48 hours</strong> to
                complete, depending on the complexity of changes requested.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Actions */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            While you wait, you can:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-gray-300">
              <MessageSquare className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-white">Add more comments</p>
                <p>Continue adding notes in Frame.io until the editor starts</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Upload className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-white">
                  Upload additional footage
                </p>
                <p>Add any new files that might be helpful for the revision</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Info */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <FileVideo className="w-8 h-8 text-cyan-400" />
            <div>
              <p className="text-sm text-gray-400">Project</p>
              <p className="text-lg font-semibold text-white">
                {project.title}
              </p>
              <p className="text-sm text-cyan-400 mt-1">
                Status: Revision in Progress
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back to Dashboard */}
      <div className="text-center">
        <Button
          onClick={onBack}
          size="lg"
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Button>
        <p className="text-sm text-gray-500 mt-3">
          We'll send you an email as soon as your revised video is ready!
        </p>
      </div>
    </div>
  );
}
