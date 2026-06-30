import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Printer, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const INFRACTION_CODES: Record<string, string> = {
  "7455": "Transitar em velocidade superior à máxima permitida em até 20%",
  "7463":
    "Transitar em velocidade superior à máxima permitida em mais de 20% até 50%",
  "7471": "Transitar em velocidade superior à máxima permitida em mais de 50%",
  "6050": "Avançar o sinal vermelho do semáforo ou de parada obrigatória",
  "5673": "Parar sobre faixa de pedestres na mudança de sinal",
  "5185": "Deixar de usar o cinto de segurança",
  "7366": "Dirigir utilizando telefone celular",
  "6599": "Conduzir veículo que não esteja registrado e devidamente licenciado",
  "5819": "Transitar com o veículo em calçadas, passeios, passarelas",
  "5967": "Ultrapassar pela contramão linha de divisão de fluxos opostos",
};

interface InfractionPrintModalProps {
  infraction: any;
  onClose: () => void;
}

export default function InfractionPrintModal({
  infraction,
  onClose,
}: InfractionPrintModalProps) {
  useEffect(() => {
    if (infraction) {
      document.body.classList.add("modal-open-for-print");
    }
    return () => {
      document.body.classList.remove("modal-open-for-print");
    };
  }, [infraction]);

  if (!infraction) return null;

  const handlePrint = () => {
    window.print();
  };

  const amount = Number(infraction.amount) || 0;
  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);

  const infractionDesc =
    INFRACTION_CODES[infraction.infraction_code] ||
    infraction.description ||
    "Outra infração";
  const formattedDate = infraction.infraction_date
    ? format(parseISO(infraction.infraction_date), "dd/MM/yyyy", {
        locale: ptBR,
      })
    : "";

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:p-0 print:bg-white print:backdrop-blur-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:w-full print:max-w-none print:rounded-none print:overflow-visible"
        >
          {/* Header - Screen Only */}
          <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50 print:hidden">
            <h2 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <Printer className="text-red-500" size={24} />
              Visualização de Impressão - Termo de Desconto
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Printer size={16} /> Imprimir Termo
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Printable Content */}
          <div className="p-8 overflow-y-auto print:overflow-visible print:block print:p-8 text-black bg-white">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="text-center font-bold text-lg mb-6 border-b border-black pb-4 uppercase">
                Termo de Responsabilidade e Desconto de Multa
              </div>

              <div className="space-y-2 text-sm font-medium border-b border-black pb-4">
                <div className="flex gap-2">
                  <span className="w-48">Condutor:</span>{" "}
                  <span className="font-bold">
                    {infraction.profiles?.full_name || ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-48">Veículo / Placa:</span>{" "}
                  <span className="font-bold">
                    {infraction.license_plate || ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-48">Data da Autuação:</span>{" "}
                  <span className="font-bold">{formattedDate}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-48">Número da Multa / Auto:</span>{" "}
                  <span className="font-bold">
                    {infraction.notice_number || ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-48">Infração:</span>{" "}
                  <span className="font-bold">
                    {infraction.infraction_code} -- {infractionDesc}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-48">Valor da Multa:</span>{" "}
                  <span className="font-bold">{formattedAmount}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-bold border-b border-black pb-4 pt-2">
                <span>( &nbsp; &nbsp; ) Vou realizar Real Infrator</span>
                <span>( &nbsp; &nbsp; ) Não vou realizar Real Infrator</span>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-base uppercase">
                  1. DECLARAÇÃO / INDICAÇÃO DO REAL INFRATOR
                </h3>
                <p className="text-sm text-justify">
                  Por meio deste termo, declaro que{" "}
                  <strong>
                    EU ERA O CONDUTOR DO VEÍCULO NO MOMENTO DA INFRAÇÃO
                  </strong>{" "}
                  e que não realizarei a indicação de outro real infrator.
                </p>
                <p className="text-sm text-justify">
                  Declaro, ainda, que estou ciente de que a não indicação do
                  condutor implicará na cobrança da multa em valor duplicado,
                  conforme as regras de responsabilidade previstas no art. 257
                  do Código de Trânsito Brasileiro (CTB).
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-base uppercase">2. VALORES</h3>
                <div className="text-sm space-y-1">
                  <p>
                    • Valor Multa: <strong>{formattedAmount}</strong>
                  </p>
                  <p>
                    • Valor da Multa por Não Identificação do Condutor (NIC):
                    _________________
                  </p>
                </div>
                <p className="text-sm">
                  Declaro estar ciente dos valores acima descritos.
                </p>
                <div className="pt-6 pb-2">
                  <p className="text-sm">
                    Assinatura do Condutor:
                    ___________________________________________________________
                  </p>
                </div>
              </div>
              <div className="border-b border-black"></div>

              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-base uppercase">
                  3. AUTORIZAÇÃO DE DESCONTO EM FOLHA
                </h3>
                <p className="text-sm">
                  ( &nbsp; &nbsp; ) Autorizo o desconto do valor referente à
                  multa, conforme opção assinalada acima, diretamente em minha
                  folha de pagamento.
                </p>
                <div className="pt-6 pb-2">
                  <p className="text-sm">
                    Assinatura do Condutor:
                    ___________________________________________________________
                  </p>
                </div>
              </div>
              <div className="border-b border-black"></div>

              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-base uppercase">
                  4. ASSINATURA (EMPRESA)
                </h3>
                <div className="pt-4 pb-2 space-y-6">
                  <p className="text-sm">
                    Responsável:
                    ____________________________________________________________________
                  </p>
                  <p className="text-sm">
                    Assinatura:
                    ______________________________________________________________________
                  </p>
                </div>
                <div className="pt-6 pb-2">
                  <p className="text-sm">Data: _____ / _____ / _________</p>
                </div>
              </div>
              <div className="border-b border-black border-dashed mt-8 mb-8"></div>

              <div className="space-y-6 pt-4 pb-12">
                <h3 className="font-bold text-lg text-center uppercase">
                  TERMO FINANCEIRO RH
                </h3>
                <div className="space-y-2 text-sm font-medium">
                  <div className="flex gap-2">
                    <span className="w-32">Multa:</span>{" "}
                    <span className="font-bold">
                      {infraction.notice_number || ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-32">Motorista:</span>{" "}
                    <span className="font-bold">
                      {infraction.profiles?.full_name || ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-32">Valor:</span>{" "}
                    <span className="font-bold">{formattedAmount}</span>
                  </div>
                </div>

                <div className="pt-4 space-y-8">
                  <h4 className="font-bold text-base underline">RH</h4>
                  <p className="text-sm">
                    Desconto em: _____X &nbsp; {formattedAmount} &nbsp;
                    ____/____
                  </p>
                  <div className="flex justify-between text-sm pt-4">
                    <span>Data: _____ / _____ / _________</span>
                    <span>
                      Assinatura: _______________________________________
                    </span>
                  </div>
                </div>

                <div className="pt-8 space-y-8">
                  <h4 className="font-bold text-base underline">Financeiro</h4>
                  <div className="flex justify-between text-sm pt-4">
                    <span>Data: _____ / _____ / _________</span>
                    <span>
                      Assinatura: _______________________________________
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
