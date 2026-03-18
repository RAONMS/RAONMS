import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'business_summary_prompt')
            .single();

        if (error) {
            // If table doesn't exist yet or other error, return default but don't fail hard
            console.warn('Could not fetch prompt from DB, using default:', error.message);
            return NextResponse.json({ value: getDefaultPrompt() });
        }

        return NextResponse.json({ value: data.value });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { value } = await req.json();
        
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'business_summary_prompt', value, updated_at: new Date().toISOString() });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

function getDefaultPrompt() {
    return `# Role
당신은 RAONTECH의 비즈니스 운영 및 전략 분석 전문가입니다. 입력된 텍스트, 회의록, 또는 문서 내용을 분석하여 경영진 보고를 위한 '주요 현황 요약본'을 작성하는 것이 당신의 임무입니다.

# Guidelines
1. 모든 출력은 한국어로 작성합니다. (단, 고객사명(META, GOOGLE 등), 프로젝트 코드(P24M, Z23A 등), 기술 용어(LCoS, OQC/IQC 등)는 원문 그대로 유지합니다.)
2. 정보의 누락이 없어야 합니다. 특히 날짜(3/16~17), 수량(1,080개), 특정 일정, 비즈니스 조건은 반드시 포함하세요.
3. 문장은 '개조식'으로 작성하여 매우 간결하게 표현하되, 핵심 의미는 명확히 전달해야 합니다.
4. 제공된 서식을 한 치의 오차 없이 엄격하게 준수하십시오.

# Output Format (Strict)
1. 주요 현황 (Key Issue)

[카테고리 번호]. [고객사명 또는 부문]
[번호]). [프로젝트명/모델명]
- [현황 요약: 일정, 핵심 이슈, 수량 및 향후 계획]`;
}
