const vipPlans = [
    {
        id: 'vip-standard',
        name: 'VIP Bronze',
        price: 50,
        duration: '30 días',
        description: 'Acceso a señales básicas de Trading Spot.',
        benefits: ['Señales Spot', 'Soporte Básico', 'Canal de Telegram']
    },
    {
        id: 'vip-gold',
        name: 'VIP Gold',
        price: 100,
        duration: '30 días',
        description: 'Acceso a señales avanzadas Spot y Margen.',
        benefits: ['Señales Spot & Margen', 'Soporte Prioritario', 'Análisis Técnico Semanal']
    },
    {
        id: 'vip-diamond',
        name: 'VIP Diamond',
        price: 200,
        duration: '30 días',
        description: 'Acceso total a todas las operaciones y señales.',
        benefits: ['Señales Spot, Margen & Futuros', 'Soporte 24/7', 'Mentoría 1-a-1']
    }
];

export default vipPlans;
