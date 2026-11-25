import type { WindowMatch } from './preparationWindows';
import type {
  PersonalCompassSummary,
} from './personalCompass';

export type PreparationSource =
  | 'general'
  | 'context'
  | 'time'
  | 'user_window';

export interface PreparationSuggestion {
  id: string;
  version: number;
  title: string;
  plan: string;
  reason: string;
  source: PreparationSource;
  icon:
    | 'sunrise'
    | 'moon'
    | 'coffee'
    | 'message-circle'
    | 'smartphone'
    | 'wind'
    | 'sun'
    | 'heart';
}

type PreparationContent = Pick<
  PreparationSuggestion,
  'id' | 'title' | 'plan' | 'icon'
>;

const GENERAL: PreparationContent = {
  id: 'general_screen_break',
  title: 'Make room for a better day.',
  plan: 'Choose somewhere to put my phone when I need a break.',
  icon: 'sunrise',
};

const CONTEXT_PLANS: Record<
  string,
  PreparationContent
> = {
  exhausted: {
    id: 'context_rest',
    title: 'Make room for rest.',
    plan: 'Give myself ten minutes away from screens when I feel tired.',
    icon: 'moon',
  },

  lonely: {
    id: 'context_connection',
    title: 'Make time for connection.',
    plan: 'Arrange a short conversation with someone I trust.',
    icon: 'message-circle',
  },

  stressed: {
    id: 'context_pressure',
    title: 'Make room for a break.',
    plan: 'Take a short screen-free break when I feel under pressure.',
    icon: 'coffee',
  },

  bored: {
    id: 'context_alternative',
    title: 'Have something else ready.',
    plan: 'Choose one enjoyable offline activity for my next free moment.',
    icon: 'sun',
  },

  numb: {
    id: 'context_grounding',
    title: 'Reconnect with your surroundings.',
    plan: 'Spend a few minutes noticing my surroundings away from the screen.',
    icon: 'wind',
  },

  rejected: {
    id: 'context_kindness',
    title: 'Make space for yourself.',
    plan: 'Choose one supportive person or activity to turn to when I feel hurt.',
    icon: 'heart',
  },

  autopilot: {
    id: 'context_interrupt',
    title: 'Interrupt the usual routine.',
    plan: 'Put my phone away before beginning an activity that needs my attention.',
    icon: 'smartphone',
  },
};

const REST_PLAN: PreparationContent = {
  id: 'time_rest',
  title: 'Prepare for your rest.',
  plan: 'Put my phone somewhere out of reach before settling down to rest.',
  icon: 'moon',
};

const MORNING_PLAN: PreparationContent = {
  id: 'time_morning',
  title: 'Begin with intention.',
  plan: 'Choose one activity to do before opening social feeds in the morning.',
  icon: 'sunrise',
};

const DAY_PLAN: PreparationContent = {
  id: 'time_day',
  title: 'Prepare for a short break.',
  plan: 'Keep one screen-free activity ready for my next break.',
  icon: 'coffee',
};

const EVENING_PLAN: PreparationContent = {
  id: 'time_evening',
  title: 'Prepare for your evening.',
  plan: 'Choose an offline activity for a quiet part of my evening.',
  icon: 'moon',
};

function timePlan(
  key: string
): PreparationContent | null {
  if (['0', '1', '7'].includes(key)) {
    return REST_PLAN;
  }

  if (['2', '3'].includes(key)) {
    return MORNING_PLAN;
  }

  if (['4', '5'].includes(key)) {
    return DAY_PLAN;
  }

  if (key === '6') {
    return EVENING_PLAN;
  }

  return null;
}

export function getDailyPreparation(
  compass: PersonalCompassSummary | null,
  windowMatch: WindowMatch | null = null,
  avoided: readonly string[] = []
): PreparationSuggestion {
  const allowed = (id: string) =>
    !avoided.includes(id + ':1');

  if (windowMatch && allowed('user_window_prepare')) {
    return {
      id: 'user_window_prepare',
      version: 1,
      title: windowMatch.activeNow
        ? 'Make room for a break.'
        : 'Prepare for the next few hours.',
      plan: 'Choose one screen-free activity or place to put my phone during this time.',
      reason:
        'You chose ' + windowMatch.window.start +
        ' - ' + windowMatch.window.end +
        ' as a preparation window.',
      source: 'user_window',
      icon: 'coffee',
    };
  }

  const context = compass?.contextPattern;

  if (
    context &&
    Object.prototype.hasOwnProperty.call(
      CONTEXT_PLANS,
      context.key
    ) &&
    allowed(CONTEXT_PLANS[context.key].id)
  ) {
    return {
      ...CONTEXT_PLANS[context.key],
      version: 1,
      source: 'context',
      reason:
        context.label + ' was selected in ' +
        context.count + ' of ' + context.total +
        ' pauses with a recorded context.',
    };
  }

  const time = compass?.timePattern;

  if (time) {
    const plan = timePlan(time.key);

    if (plan && allowed(plan.id)) {
      return {
        ...plan,
        version: 1,
        source: 'time',
        reason:
          time.count + ' of ' + time.total +
          ' recorded pauses occurred between ' +
          time.label + '.',
      };
    }
  }

  return {
    ...GENERAL,
    version: 1,
    source: 'general',
    reason: 'A general preparation suggestion.',
  };
}
