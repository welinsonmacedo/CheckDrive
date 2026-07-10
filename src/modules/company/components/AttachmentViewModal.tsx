import React from "react";
import { createPortal } from "react-dom";
import { X, Eye } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AttachmentViewModalProps {
  attachmentUrl: string;
  onClose: () => void;
}

export default function AttachmentViewModal({
  attachmentUrl,
  onClose,
}: AttachmentViewModalProps) {
  if (!attachmentUrl) return null;

  const isPdf = typeof attachmentUrl === "string" && attachmentUrl.toLowerCase().includes(".pdf");

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        key="attachment-modal"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          <div className="bg-white border-b border-zinc-100 p-4 flex justify-between items-center z-10">
            <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
              <Eye className="text-indigo-500" />
              Visualizar Anexo
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-zinc-100/50 p-4 flex items-center justify-center min-h-[500px]">
            {isPdf ? (
              <iframe
                src={attachmentUrl}
                className="w-full h-[70vh] rounded-xl border border-zinc-200"
                title="Anexo PDF"
              />
            ) : (
              <img
                src={attachmentUrl}
                alt="Anexo da Infração"
                className="max-w-full max-h-[70vh] rounded-xl border border-zinc-200 object-contain shadow-sm"
              />
            )}
          </div>

          <div className="p-4 border-t border-zinc-100 bg-white flex justify-end">
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Abrir Original em Nova Guia
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
