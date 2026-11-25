
import {
  sanctuaryDescription,
} from '../content/sanctuaryGrowth';

import type {
  SanctuaryStage,
} from '../content/sanctuaryGrowth';

import { View } from 'react-native';

import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import type { V2Mode } from '../theme/stillwaterV2';

const STARS = [
  [40, 37],
  [85, 64],
  [122, 22],
  [172, 47],
  [304, 28],
  [321, 89],
  [211, 17],
];

const TREES = [
  { x: 18, y: 245, height: 90 },
  { x: 47, y: 251, height: 66 },
  { x: 335, y: 251, height: 99 },
  { x: 308, y: 260, height: 62 },
];

const RIPPLES = [
  [62, 215, 60],
  [125, 249, 76],
  [37, 278, 105],
  [221, 272, 69],
];

export function SanctuaryLandscape({
  mode = 'day',
  compact = false,
  stage = 0,
}: {
  mode?: V2Mode;
  compact?: boolean;
  stage?: SanctuaryStage;
}) {
  const night = mode === 'night';

  const prefix = compact
    ? 'sanctuary-preview'
    : 'sanctuary-full';

  const skyId = prefix + '-sky';
  const waterId = prefix + '-water';

  const foreground =
    night ? '#132D29' : '#193B35';

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        (night
          ? 'A peaceful moonlit lake surrounded by trees and distant mountains.'
          : 'A peaceful lake in warm daylight, surrounded by trees and distant mountains.') +
        sanctuaryDescription(stage)
      }
      style={{
        width: '100%',
        aspectRatio: compact ? 1.5 : 1.2,
        overflow: 'hidden',
        borderRadius: compact ? 15 : 24,
        backgroundColor:
          night ? '#14282B' : '#C3D5C9',
      }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 300"
        preserveAspectRatio={compact ? "xMidYMax slice" : "xMidYMid slice"}
      >
        <Defs>
          <LinearGradient
            id={skyId}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop
              offset="0%"
              stopColor={
                night ? '#14282B' : '#C3D5C9'
              }
            />

            <Stop
              offset="100%"
              stopColor={
                night ? '#516A64' : '#F1E4CA'
              }
            />
          </LinearGradient>

          <LinearGradient
            id={waterId}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop
              offset="0%"
              stopColor={
                night ? '#54736B' : '#A6C0AE'
              }
            />

            <Stop
              offset="100%"
              stopColor={
                night ? '#183630' : '#486F61'
              }
            />
          </LinearGradient>
        </Defs>

        {/* Sky and celestial light */}

        <Rect
          width={360}
          height={300}
          fill={'url(#' + skyId + ')'}
        />

        <Circle
          cx={252}
          cy={59}
          r={38}
          fill={night ? '#E5DCC3' : '#E4BE80'}
          opacity={0.12}
        />

        <Circle
          cx={252}
          cy={59}
          r={26}
          fill={night ? '#E5DCC3' : '#E4BE80'}
          opacity={0.94}
        />

        {night && STARS.map(([x, y], index) => (
          <Circle
            key={index}
            cx={x}
            cy={y}
            r={1.3}
            fill="#E5DCC3"
            opacity={0.75}
          />
        ))}

        {/* Distant mountain layers */}

        <Path
          d="M0 146 L66 53 L113 112 L162 81 L220 145 L279 86 L360 141 V300 H0Z"
          fill={night ? '#3A5654' : '#A7BAAE'}
        />

        <Path
          d="M0 164 Q60 102 125 152 T231 145 T360 133 V300 H0Z"
          fill={night ? '#294640' : '#779A8B'}
        />

        <Path
          d="M0 182 Q85 141 166 174 T360 159 V300 H0Z"
          fill={night ? '#203C37' : '#48645A'}
        />

        {/* Lake and reflected light */}

        <Path
          d="M0 195 Q78 180 166 191 T360 180 V300 H0Z"
          fill={'url(#' + waterId + ')'}
        />

        {Array.from({ length: 8 }, (_, i) => (
          <Path
            key={i}
            d={
              'M' + (223 - i * 8) +
              ' ' + (202 + i * 10) +
              ' q' + (20 + i * 4) +
              ' -2 ' + (53 + i * 7) + ' 0'
            }
            stroke={
              night ? '#D6CBB1' : '#E8D7AA'
            }
            strokeWidth={1.2}
            strokeLinecap="round"
            opacity={0.55 - i * 0.04}
            fill="none"
          />
        ))}

        {RIPPLES.map(([x, y, length], i) => (
          <Path
            key={i}
            d={'M' + x + ' ' + y + ' h' + length}
            stroke="#DCE6D9"
            opacity={0.25}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        ))}

        {/* Foreground banks */}

        <Path
          d="M0 250 Q32 225 77 247 Q108 262 131 300 H0Z"
          fill={foreground}
        />

        <Path
          d="M360 231 Q314 232 292 266 L264 300 H360Z"
          fill={night ? '#142F2A' : '#29443F'}
        />

        {/* Evergreen trees */}

        {TREES.map(tree => (
          <G key={tree.x}>
            <Path
              d={
                'M' + tree.x + ' ' + tree.y +
                ' v-' + tree.height
              }
              stroke={foreground}
              strokeWidth={3}
            />

            {[0, 1, 2].map(layer => (
              <Path
                key={layer}
                d={
                  'M' + tree.x + ' ' +
                  (
                    tree.y -
                    tree.height -
                    3 +
                    layer * tree.height * 0.2
                  ) +
                  ' l' + (-11 - layer * 4) +
                  ' ' + tree.height * 0.48 +
                  ' h' + (22 + layer * 8) + 'Z'
                }
                fill={
                  night
                    ? '#132D29'
                    : layer === 0
                      ? '#36534D'
                      : '#193B35'
                }
              />
            ))}
          </G>
        ))}

        {/* Quiet Christian symbolism */}

        <Path
          d="M280 182 V155 M272 164 H288"
          stroke={night ? '#B6C9BE' : '#36534D'}
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* Small foreground stones */}

        <Ellipse
          cx={81}
          cy={274}
          rx={15}
          ry={5}
          fill={night ? '#49665C' : '#9AAEA0'}
        />

        <Ellipse
          cx={91}
          cy={281}
          rx={9}
          ry={3}
          fill={night ? '#36534D' : '#779A8B'}
        />

        {/* Permanent olive sapling */}

        {stage >= 1 && (
          <G>
            <Path
              d="M66 265 Q69 240 63 215 M67 242 L49 227 M67 235 L84 218"
              stroke={night ? '#8E826D' : '#AD9472'}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
            />

            {[
              [47,225], [55,216], [63,210],
              [77,214], [84,222], [53,237],
              [76,232], [68,224],
            ].map(([x, y], index) => (
              <Ellipse
                key={index}
                cx={x}
                cy={y}
                rx={10}
                ry={5}
                fill={night ? '#78917A' : '#9FB58B'}
                transform={
                  'rotate(-28 ' + x + ' ' + y + ')'
                }
              />
            ))}
          </G>
        )}

        {/* Permanent lakeside bench */}

        {stage >= 2 && (
          <G>
            <Path
              d="M83 273 L111 273 M85 264 H109 M87 260 V281 M106 260 V281"
              stroke={night ? '#998C74' : '#C4AD86'}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
            />

            <Path
              d="M84 269 H110"
              stroke={night ? '#998C74' : '#C4AD86'}
              strokeWidth={2}
            />
          </G>
        )}

        {/* Permanent lantern */}

        {stage >= 3 && (
          <G>
            <Circle
              cx={291}
              cy={246}
              r={24}
              fill="#E4BE80"
              opacity={night ? 0.22 : 0.10}
            />

            <Circle
              cx={291}
              cy={246}
              r={13}
              fill="#E4BE80"
              opacity={night ? 0.35 : 0.20}
            />

            <Path
              d="M291 285 V230"
              stroke="#A68A64"
              strokeWidth={3}
            />

            <Rect
              x={285}
              y={235}
              width={12}
              height={18}
              rx={3}
              fill="#F5DB9D"
              stroke="#AD9472"
              strokeWidth={1.5}
            />

            <Path
              d="M283 235 L291 228 L299 235Z"
              fill="#786246"
            />
          </G>
        )}

        {/* Permanent wildflowers */}

        {stage >= 4 && (
          <G>
            {[
              [15,278], [31,285], [45,275],
              [59,290], [112,292], [326,278],
              [342,291], [310,289],
            ].map(([x, y], index) => (
              <G key={index}>
                <Path
                  d={
                    'M' + x + ' ' + y +
                    ' v-11 m0 6 l-4 -4'
                  }
                  stroke="#A6C0AE"
                  strokeWidth={1.6}
                  fill="none"
                />

                <Circle
                  cx={x}
                  cy={y - 11}
                  r={3.6}
                  fill={
                    index % 2 === 0
                      ? '#E8CA91'
                      : '#E0C3C6'
                  }
                />
              </G>
            ))}
          </G>
        )}

      </Svg>
    </View>
  );
}
