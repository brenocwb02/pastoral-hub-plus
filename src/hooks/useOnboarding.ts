import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const ONBOARDING_KEY = 'cuidar_plus_onboarding_completed';

export function useOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    setHasCompletedOnboarding(completed === 'true');
  }, []);

  const startOnboarding = (page: 'dashboard' | 'members' | 'houses') => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Próximo',
      prevBtnText: 'Anterior',
      doneBtnText: 'Concluir',
      steps: getStepsForPage(page),
      onDestroyStarted: () => {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setHasCompletedOnboarding(true);
        driverObj.destroy();
      }
    });

    driverObj.drive();
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setHasCompletedOnboarding(false);
  };

  return {
    hasCompletedOnboarding,
    startOnboarding,
    resetOnboarding
  };
}

function getStepsForPage(page: string) {
  const steps = {
    dashboard: [
      {
        element: 'h1',
        popover: {
          title: 'Bem-vindo ao Cuidar+! 🎉',
          description: 'Este é seu painel principal onde você acompanha todas as métricas do seu ministério.'
        }
      },
      {
        element: '[data-tour="stats-cards"]',
        popover: {
          title: 'Estatísticas Rápidas',
          description: 'Visualize rapidamente o total de membros, casas, encontros e reuniões.'
        }
      },
      {
        element: '[data-tour="charts"]',
        popover: {
          title: 'Gráficos e Análises',
          description: 'Acompanhe o crescimento e progresso através de gráficos interativos.'
        }
      },
      {
        element: '[data-tour="quick-actions"]',
        popover: {
          title: 'Ações Rápidas',
          description: 'Acesse rapidamente as ações mais comuns como cadastrar membros ou agendar reuniões.'
        }
      }
    ],
    members: [
      {
        element: 'h1',
        popover: {
          title: 'Gestão de Membros',
          description: 'Aqui você gerencia todos os membros da sua igreja.'
        }
      },
      {
        element: '[data-tour="add-member"]',
        popover: {
          title: 'Adicionar Novo Membro',
          description: 'Clique aqui para cadastrar um novo membro com todas as informações necessárias.'
        }
      },
      {
        element: '[data-tour="search-filter"]',
        popover: {
          title: 'Busca e Filtros',
          description: 'Use a busca para encontrar membros específicos e filtros para organizar a visualização.'
        }
      }
    ],
    houses: [
      {
        element: 'h1',
        popover: {
          title: 'Igrejas no Lar',
          description: 'Gerencie as casas e seus líderes.'
        }
      },
      {
        element: '[data-tour="add-house"]',
        popover: {
          title: 'Nova Casa',
          description: 'Cadastre novas igrejas no lar e atribua líderes.'
        }
      }
    ]
  };

  return steps[page] || steps.dashboard;
}
