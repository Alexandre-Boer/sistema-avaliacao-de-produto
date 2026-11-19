import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSummaryModel } from "@/mastra/summary-model";
import {
  type FeedbackForSummary,
  summarizeFeedbacks,
} from "@/server/ai-summary/summarize-feedbacks";

/** Com menos avaliações que isso o resumo só repetiria os comentários. */
export const AI_SUMMARY_MIN_FEEDBACKS = 3;

/** Quantas avaliações (as mais recentes) são lidas para gerar o resumo. */
export const AI_SUMMARY_MAX_FEEDBACKS = 200;

export type AiSummary = {
  summary: string;
  /** Quantas avaliações o produto tinha quando o resumo foi gerado. */
  feedbacksCount: number;
  generatedAt: string;
};

type SummaryRow = {
  summary: string;
  feedbacks_count: number;
  generated_at: string;
};

function toAiSummary(row: SummaryRow): AiSummary {
  return {
    summary: row.summary,
    feedbacksCount: row.feedbacks_count,
    generatedAt: row.generated_at,
  };
}

/**
 * Resumo da IA para as avaliações de um produto, ou `null` quando não há o que
 * mostrar.
 *
 * O resumo fica guardado em `products_ai_summaries` com a quantidade de
 * avaliações que ele cobriu. Como a aplicação não edita nem apaga avaliações,
 * essa quantidade identifica o conjunto: enquanto ela não muda o resumo
 * guardado é devolvido, e o modelo só é chamado quando chega avaliação nova.
 *
 * Nunca lança. Sem IA configurada, ou se o modelo falhar ou demorar, devolve o
 * resumo anterior (se existir) ou `null`: a página do produto segue normal.
 */
export async function getAiSummary(product: {
  id: string;
  name: string;
}): Promise<AiSummary | null> {
  let stored: AiSummary | null = null;

  try {
    const supabase = createAdminClient();

    const [counting, existing] = await Promise.all([
      supabase
        .from("products_feedbacks")
        .select("id", { count: "exact", head: true })
        .eq("product_id", product.id),
      supabase
        .from("products_ai_summaries")
        .select("summary, feedbacks_count, generated_at")
        .eq("product_id", product.id)
        .maybeSingle(),
    ]);

    if (counting.error) {
      throw new Error(counting.error.message);
    }
    if (existing.error) {
      throw new Error(existing.error.message);
    }

    const total = counting.count ?? 0;
    if (total < AI_SUMMARY_MIN_FEEDBACKS) {
      return null;
    }

    stored = existing.data ? toAiSummary(existing.data as SummaryRow) : null;
    if (stored && stored.feedbacksCount === total) {
      return stored;
    }

    const config = resolveSummaryModel();
    if (!config) {
      return stored;
    }

    const recent = await supabase
      .from("products_feedbacks")
      .select("score, comment")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(AI_SUMMARY_MAX_FEEDBACKS);

    if (recent.error) {
      throw new Error(recent.error.message);
    }

    const summary = await summarizeFeedbacks(
      product.name,
      (recent.data ?? []) as FeedbackForSummary[],
    );
    const generated: AiSummary = {
      summary,
      feedbacksCount: total,
      generatedAt: new Date().toISOString(),
    };

    // Duas visitas ao mesmo tempo podem gerar o resumo em paralelo; o `upsert`
    // pela chave primária faz a última gravação valer, sem erro nem duplicata.
    const saving = await supabase.from("products_ai_summaries").upsert({
      product_id: product.id,
      summary,
      feedbacks_count: total,
      model: config.label,
      generated_at: generated.generatedAt,
    });
    if (saving.error) {
      // O resumo existe e pode ser mostrado; só não ficou guardado.
      console.error(
        "[resumo da IA] falha ao gravar o resumo:",
        saving.error.message,
      );
    }

    return generated;
  } catch (error) {
    console.error(
      `[resumo da IA] falha ao gerar o resumo do produto ${product.id}:`,
      error,
    );
    return stored;
  }
}
