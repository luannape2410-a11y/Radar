import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import radarLogo from "@/assets/radar-logo.png";

const Sobre = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between py-5">
          <div className="flex items-center gap-4">
            <img src={radarLogo} alt="RADAR" className="h-14 w-auto shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Prefeitura Municipal de Vazante-MG
              </p>
              <h1 className="text-2xl font-bold">Sobre o RADAR</h1>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar ao painel
            </Link>
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>O que é o RADAR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              O <strong className="text-foreground">RADAR — Acompanhamento e Monitoramento da
              Execução Orçamentária</strong> é um painel desenvolvido para apoiar a gestão
              pública municipal no acompanhamento contínuo da execução das despesas por
              subelementos orçamentários.
            </p>
            <p>
              A ferramenta consolida lançamentos por unidade gestora, função, fornecedor e
              período, permitindo análises comparativas entre exercícios, identificação de
              gastos atípicos, geração de alertas gerenciais e a exportação de relatórios
              nos formatos PDF, XLS e DOC.
            </p>
            <p>
              O objetivo do RADAR é dar transparência, tempestividade e capacidade analítica
              à tomada de decisão, contribuindo para a eficiência, a economicidade e o
              controle da execução orçamentária do município.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Responsável pelo desenvolvimento</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            <p className="text-foreground font-medium">
              Controladoria Geral do Município de Vazante-MG
            </p>
            <p className="text-muted-foreground mt-1">
              Concepção, desenvolvimento e manutenção do painel.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Sobre;