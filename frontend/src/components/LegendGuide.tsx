import { BookOpen, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface LegendRow {
  indicator: string;
  meaning: string;
  interpretation: string;
}

const globalRows: LegendRow[] = [
  { indicator: "Alfa de Cronbach", meaning: "Estima a consistencia interna da avaliacao.", interpretation: "Valores mais proximos de 1 indicam maior confiabilidade. Em muitos estudos, 0,70 ou mais e usado como referencia inicial." },
  { indicator: "Media de acertos", meaning: "Media do escore bruto dos estudantes.", interpretation: "Resume o desempenho geral da amostra na avaliacao." },
  { indicator: "Percentual medio", meaning: "Media de acertos dividida pelo numero de itens.", interpretation: "Facilita comparar avaliacoes com quantidades diferentes de itens." },
  { indicator: "Numero de examinados", meaning: "Total de estudantes analisados.", interpretation: "Amostras maiores tendem a produzir estimativas mais estaveis." },
  { indicator: "Numero de itens", meaning: "Total de questoes binarias processadas.", interpretation: "Afeta diretamente os escores, a matriz S-P e a confiabilidade." }
];

const itemRows: LegendRow[] = [
  { indicator: "Frequencia de acertos", meaning: "Quantidade absoluta de estudantes que acertaram o item.", interpretation: "Mostra o volume de acertos, mas deve ser lida junto ao tamanho da amostra." },
  { indicator: "Proporcao de acertos", meaning: "Acertos do item divididos pelo total de estudantes.", interpretation: "Quanto maior, mais facil tende a ser o item." },
  { indicator: "p*", meaning: "Indice de dificuldade calculado como 1 menos a proporcao de acertos.", interpretation: "Quanto maior o p*, mais dificil foi o item para a amostra." },
  { indicator: "Discriminacao", meaning: "Diferenca entre o desempenho do grupo superior e do grupo inferior no item.", interpretation: "Valores mais altos indicam que o item separa melhor estudantes de maior e menor desempenho." },
  { indicator: "r_pbi", meaning: "Correlacao ponto-bisserial entre o item e o escore total sem o proprio item.", interpretation: "Valores positivos sugerem alinhamento entre o item e o desempenho geral." },
  { indicator: "D_i", meaning: "Proporcao de respostas inesperadas do item na matriz zonal S-P.", interpretation: "Valores altos podem indicar comportamento atipico, ambiguidade ou necessidade de revisar o item." }
];

const studentRows: LegendRow[] = [
  { indicator: "Escore bruto", meaning: "Total de itens acertados pelo estudante.", interpretation: "Medida direta do desempenho individual." },
  { indicator: "Percentual de acerto", meaning: "Escore bruto dividido pelo numero total de itens.", interpretation: "Facilita comparar desempenhos em provas com tamanhos diferentes." },
  { indicator: "C_n", meaning: "Indice de cautela baseado nos erros anomalos do estudante.", interpretation: "Valores maiores indicam mais inconsistencias em relacao ao padrao esperado pela Curva S-P." },
  { indicator: "Chutes", meaning: "Acertos inesperados em itens que seriam pouco provaveis para o padrao do estudante.", interpretation: "Pode indicar acerto casual, conhecimento pontual ou item com comportamento irregular." },
  { indicator: "Erros anomalos", meaning: "Erros em itens que seriam esperados como acertos para aquele estudante.", interpretation: "Pode sugerir distracao, lacuna especifica, problema de leitura ou inconsistencia no padrao de resposta." }
];

const spRows: LegendRow[] = [
  { indicator: "Acerto esperado", meaning: "Acerto coerente com o desempenho do estudante e a facilidade do item.", interpretation: "Padrao regular na matriz S-P." },
  { indicator: "Erro esperado", meaning: "Erro coerente com o desempenho do estudante e a dificuldade do item.", interpretation: "Padrao regular na matriz S-P." },
  { indicator: "Acerto inesperado", meaning: "Acerto em item que seria considerado dificil para o perfil do estudante.", interpretation: "Pode ser chute, dominio especifico ou item com calibracao instavel." },
  { indicator: "Erro anomalo", meaning: "Erro em item que seria esperado como acerto para o perfil do estudante.", interpretation: "Pode indicar descuido, dificuldade localizada ou possivel problema no item." }
];

const quickRows: LegendRow[] = [
  { indicator: "p* alto + r_pbi baixo", meaning: "Item dificil e pouco associado ao desempenho geral.", interpretation: "Prioridade para revisao pedagogica ou tecnica." },
  { indicator: "Discriminacao baixa", meaning: "O item pouco diferencia grupos de maior e menor desempenho.", interpretation: "Pode ser facil demais, dificil demais ou desalinhado ao construto." },
  { indicator: "Muitos erros anomalos", meaning: "Ha respostas erradas fora do padrao esperado.", interpretation: "Investigar enunciado, alternativa correta, conteudo ou condicoes de aplicacao." },
  { indicator: "Muitos chutes", meaning: "Ha acertos fora do padrao esperado.", interpretation: "Investigar possibilidade de acerto casual, item ambivalente ou conhecimento pontual." }
];

export function LegendGuide() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-academy-teal" />
              Legendas e interpretacao dos indicadores
            </CardTitle>
            <p className="mt-1 text-sm text-slate-400">Consulta rapida para apoiar a leitura academica dos resultados.</p>
          </div>
          <Badge className="rounded-md">
            <Info className="mr-1.5 h-3.5 w-3.5" />
            Guia provisoria
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-academy-line bg-white/[.03] p-4 text-sm leading-6 text-slate-300">
            Use estas interpretacoes como apoio inicial. A decisao final sobre qualidade do item, desempenho do estudante
            ou confiabilidade da avaliacao deve considerar o contexto curricular, o tamanho da amostra e os objetivos da pesquisa.
          </div>
        </CardContent>
      </Card>

      <LegendTable title="Indicadores globais" rows={globalRows} />
      <LegendTable title="Indicadores por item" rows={itemRows} />
      <LegendTable title="Indicadores por estudante" rows={studentRows} />
      <LegendTable title="Matriz zonal e Curva S-P" rows={spRows} />
      <LegendTable title="Leitura rapida de situacoes comuns" rows={quickRows} />
    </div>
  );
}

function LegendTable({ title, rows }: { title: string; rows: LegendRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-md border border-academy-line scrollbar-thin">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-academy-blue text-slate-200">
              <tr>
                <th className="w-48 px-3 py-3 font-medium">Indicador</th>
                <th className="px-3 py-3 font-medium">Significado</th>
                <th className="px-3 py-3 font-medium">Como interpretar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.indicator} className="border-t border-academy-line odd:bg-white/[.03]">
                  <td className="px-3 py-3 font-medium text-slate-100">{row.indicator}</td>
                  <td className="px-3 py-3 text-slate-300">{row.meaning}</td>
                  <td className="px-3 py-3 text-slate-300">{row.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

