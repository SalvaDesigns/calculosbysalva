export interface Category {
    id: string;
    nombre: string;
    salarioBase: number;
    plusConvenio: number;
    plusDistancia: number;
    iguala: number;
    bolsa: number;
    pagasExtras: number; // Valor de una paga extra base
}

export interface PayrollInput {
    categoryId: string;
    jornadaSemanal: number; // 0-40
    fechaAlta: string;
    irpfManual: number;
    pagasProrrateadas: boolean;
    horasNocturnidad: number;
    minutosNocturnidad: number;
    diasVacaciones: number;
    extraDevengos?: { name: string; amount: number }[];
}

export interface DetailedSS {
    cc: number;
    desempleo: number;
    mei: number;
}

export interface NextTrienioInfo {
    mesesRestantes: number;
    fechaEfectiva: string;
    aumentoImporte: number;
}

export interface PayrollResult {
    devengos: { concept: string; amount: number }[];
    deducciones: { concept: string; amount: number }[];
    bruto: number;
    neto: number;
    baseCotizacion: number;
    costeEmpresa: {
        total: number;
        anual: number;
        seguridadSocial: number;
        indemnizacionProp: number;
        detailedSS: DetailedSS;
    };
    nextTrienio: NextTrienioInfo;
    smiHealth: number;
}

export function calculateTrienios(fechaAlta: string): number {
    const alta = new Date(fechaAlta);
    const hoy = new Date();
    let years = hoy.getFullYear() - alta.getFullYear();
    const m = hoy.getMonth() - alta.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < alta.getDate())) {
        years--;
    }
    return Math.floor(years / 3);
}

export function calculateNextTrienioInfo(fechaAlta: string, baseSalarial: number, ratioJornada: number): NextTrienioInfo {
    const alta = new Date(fechaAlta);
    const hoy = new Date();

    // Calcular fecha del próximo trienio
    const numActual = calculateTrienios(fechaAlta);
    const fechaProximo = new Date(alta);
    fechaProximo.setFullYear(alta.getFullYear() + (numActual + 1) * 3);

    const diffTime = fechaProximo.getTime() - hoy.getTime();
    const mesesRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.41)));

    return {
        mesesRestantes,
        fechaEfectiva: fechaProximo.toISOString().split('T')[0],
        aumentoImporte: (baseSalarial * ratioJornada) * 0.04
    };
}

export function calculatePayroll(
    input: PayrollInput,
    category: Category,
    config: { smiAnual: number; divisorHoras: number; ssEmpresa: number; ssTrabajador: number }
): PayrollResult {
    const ratioJornada = input.jornadaSemanal / 40;

    // Devengos base
    const salarioBase = category.salarioBase * ratioJornada;
    const plusConvenio = (category.plusConvenio || 0) * ratioJornada;

    const plusDistanciaBase = category.plusDistancia * ratioJornada;
    const descuentoDistancia = (plusDistanciaBase / 30) * input.diasVacaciones;
    const plusDistancia = Math.max(0, plusDistanciaBase - descuentoDistancia);

    const bolsaMensual = (category.bolsa || 0) * ratioJornada;
    const igualaMensual = category.iguala * ratioJornada;

    const bolsaActual = (bolsaMensual / 30) * input.diasVacaciones;
    const igualaActual = (igualaMensual / 30) * input.diasVacaciones;

    // Antigüedad (4% del base por trienio)
    const numTrienios = calculateTrienios(input.fechaAlta);
    const antiguedad = salarioBase * 0.04 * numTrienios;

    // Nocturnidad
    const totalHorasNocturnas = input.horasNocturnidad + (input.minutosNocturnidad / 60);
    const nocturnidadValue = (category.salarioBase / config.divisorHoras) * 0.25 * totalHorasNocturnas * 4.33;

    // Extra Devengos (Ad-hoc)
    const extraTotal = (input.extraDevengos || []).reduce((sum, item) => sum + item.amount, 0);

    let brutoMensual = salarioBase + plusConvenio + plusDistancia + bolsaActual + igualaActual + antiguedad + nocturnidadValue + extraTotal;

    const devengos = [
        { concept: "Salario Base", amount: salarioBase },
        { concept: "Plus Convenio", amount: plusConvenio },
        { concept: "Plus Distancia", amount: plusDistancia },
        { concept: "Bolsa Vacaciones", amount: bolsaActual },
        { concept: "Iguala", amount: igualaActual },
        { concept: "Antigüedad", amount: antiguedad },
        { concept: "Nocturnidad", amount: nocturnidadValue },
        ...(input.extraDevengos || []).map(item => ({ concept: item.name, amount: item.amount })),
    ];

    const prorrataExtra = (category.pagasExtras * ratioJornada) / 3;

    if (input.pagasProrrateadas) {
        brutoMensual += prorrataExtra;
        devengos.push({ concept: "Prorrata Pagas Extras (4 x año)", amount: prorrataExtra });
    }

    // SMI Benchmark Logic (Refined Formula)
    // Step 1: Target Monthly SMI (Total / Payments)
    const targetSmiAnual = 16576;
    const targetSmiMensual = (targetSmiAnual / (input.pagasProrrateadas ? 12 : 16)) * ratioJornada;

    // Step 2: Current Month Gross for comparison
    // In prorated case, this already includes the extras prorrata.
    const compareBruto = brutoMensual;
    const initialGap = targetSmiMensual - compareBruto;

    // Step 3: Adjustment for annual concepts paid once
    // Prop = (Bolsa/12 + Iguala/12 - DistanciaPlus/12)
    const propAdjustment = ((category.bolsa / 12) + (category.iguala / 12) - (category.plusDistancia / 12)) * ratioJornada;

    // Step 4: Final DIF SMI = Target Gap - Proportional Adjustments
    const finalDifSmi = initialGap - propAdjustment;

    if (finalDifSmi > 0) {
        brutoMensual += finalDifSmi;
        devengos.push({ concept: "DIF SMI", amount: finalDifSmi });
    }

    // SMI Health percentage (against target)
    const smiHealth = (brutoMensual / targetSmiMensual) * 100;

    // Deducciones
    const deduccionSS = brutoMensual * config.ssTrabajador;
    const deduccionIRPF = brutoMensual * (input.irpfManual / 100);

    const deducciones = [
        { concept: "Seguridad Social (" + (config.ssTrabajador * 100).toFixed(2) + "%)", amount: deduccionSS },
        { concept: "IRPF (" + input.irpfManual + "%)", amount: deduccionIRPF },
    ];

    const neto = brutoMensual - deduccionSS - deduccionIRPF;
    const baseCotizacion = input.pagasProrrateadas ? brutoMensual : (brutoMensual + prorrataExtra);

    // Coste Empresa Detailed SS
    // Standard Spanish distribution for a total rate (e.g. 32%)
    // MEI is usually fixed at 0.7% for employer
    const meiRate = 0.007;
    const ccRate = 0.236; // Contingencias Comunes
    const otRate = config.ssEmpresa - ccRate - meiRate; // Others (Unemployment, Fogasa, FP)

    const cc = baseCotizacion * ccRate;
    const mei = baseCotizacion * meiRate;
    const ot = baseCotizacion * Math.max(0, otRate);

    const ssEmpresaTotal = brutoMensual * config.ssEmpresa;
    const indemnizacionProp = brutoMensual * 0.03;

    const provisionBolsaIguala = ((bolsaMensual + igualaMensual) / 30 * 34) / 12;
    const provisionSS_BolsaIguala = provisionBolsaIguala * (config.ssEmpresa + 0.03);

    const costeMensualTotal = brutoMensual + ssEmpresaTotal + indemnizacionProp + provisionBolsaIguala + provisionSS_BolsaIguala;

    let costeAnual = (brutoMensual + ssEmpresaTotal + indemnizacionProp) * 12;
    if (!input.pagasProrrateadas) {
        const extraValue = category.pagasExtras * ratioJornada;
        const extraConSS = extraValue * (1 + config.ssEmpresa + 0.03);
        costeAnual += (extraConSS * 4);
    }

    const costeAnualBolsaIguala = (bolsaMensual + igualaMensual) / 30 * 34;
    const costeAnualBolsaIgualaConSS = costeAnualBolsaIguala * (1 + config.ssEmpresa + 0.03);

    if (input.diasVacaciones > 0) {
        const yaPagado = (bolsaActual + igualaActual) * (1 + config.ssEmpresa + 0.03);
        costeAnual -= (yaPagado * 12);
        costeAnual += yaPagado;
    }
    costeAnual += costeAnualBolsaIgualaConSS;

    return {
        devengos,
        deducciones,
        bruto: brutoMensual,
        neto,
        baseCotizacion,
        costeEmpresa: {
            total: costeMensualTotal,
            anual: costeAnual,
            seguridadSocial: ssEmpresaTotal,
            indemnizacionProp,
            detailedSS: { cc, mei, desempleo: ot }
        },
        nextTrienio: calculateNextTrienioInfo(input.fechaAlta, category.salarioBase, ratioJornada),
        smiHealth
    };
}

export interface SeveranceResult {
    diasVacaciones: number;
    importeVacaciones: number;
    prorrataPagas: { concept: string; amount: number }[];
    totalLiquido: number;
    indemnizacion: number;
    antiguedadAnos: number;
}

export function calculateSeverance(
    input: { fechaAlta: string; fechaBaja: string; vacacionesPendientes: number; incluirIndemnizacion: boolean; diasIndemnizacion: number },
    payroll: PayrollResult,
    category: Category
): SeveranceResult {
    // 1. Vacaciones
    const baseDiaria = payroll.bruto / 30;
    const importeVacaciones = input.vacacionesPendientes * baseDiaria;

    // 2. Prorrata Pagas (Calculado sobre el año actual devengado)
    const fechaBaja = new Date(input.fechaBaja);
    const mesActual = fechaBaja.getMonth() + 1;
    const diaActual = fechaBaja.getDate();

    // Prorrata aproximada: (Importe anual de extras / 12) * meses trabajados este año
    const ratioJornada = (payroll.bruto / (category.salarioBase || 1)); // Estimación del ratio de jornada
    const prorrataAnualExtras = (category.pagasExtras * ratioJornada) * 4;
    const factorTiempoExtras = (mesActual - 1 + (diaActual / 30)) / 12;
    const totalProrrataExtras = prorrataAnualExtras * factorTiempoExtras;

    const prorrataPagas = [
        { concept: "Prorrata Pagas Extras devengadas", amount: totalProrrataExtras }
    ];

    // 3. Indemnización
    let indemnizacion = 0;
    let antiguedadAnos = 0;

    if (input.incluirIndemnizacion) {
        const fAlta = new Date(input.fechaAlta);
        const fBaja = new Date(input.fechaBaja);
        const diffTime = Math.abs(fBaja.getTime() - fAlta.getTime());
        antiguedadAnos = diffTime / (1000 * 60 * 60 * 24 * 365.25);

        // La indemnización legal se calcula sobre 12 pagas + prorrata
        // Salario regulador diario = (Bruto Mensual + Prorrata Extras Mensual) / 30
        const prorrataExtrasMensual = (category.pagasExtras * ratioJornada * 4) / 12;
        const salarioReguladorDiario = (payroll.bruto + prorrataExtrasMensual) / 30;

        indemnizacion = salarioReguladorDiario * input.diasIndemnizacion * antiguedadAnos;
    }

    const totalLiquido = importeVacaciones + totalProrrataExtras + indemnizacion;

    return {
        diasVacaciones: input.vacacionesPendientes,
        importeVacaciones,
        prorrataPagas,
        indemnizacion,
        antiguedadAnos,
        totalLiquido
    };
}
