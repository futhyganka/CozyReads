import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Theme CozyReads — Caramel & Sage
 * Bảng màu chuẩn:
 * - Background: #FAF8F3
 * - Primary: #A65C25 (Hover: #88471B, Active: #713A18)
 * - Secondary (Sage): #A8B59A (Sage Light: #EDF1E9, Sage Dark: #526549)
 * - Text: #433528 (Muted Text: #75685B)
 * - Card: #FFFFFF
 * - Border: #E8E2D7
 */
export const CozyReadsPreset = definePreset(Aura, {
    primitive: {
        caramel: {
            50: '#FAF8F3',
            100: '#F4EFE4',
            200: '#E8E2D7',
            300: '#D4B499',
            400: '#BD865B',
            500: '#A65C25',
            600: '#88471B',
            700: '#713A18',
            800: '#592E13',
            900: '#433528',
            950: '#2B2118',
        },
        sage: {
            50: '#EDF1E9',
            100: '#DCE4D5',
            200: '#C5D1BA',
            300: '#A8B59A',
            400: '#889A78',
            500: '#6C7F5D',
            600: '#526549',
            700: '#41503A',
            800: '#333F2E',
            900: '#262F22',
            950: '#171D15',
        },
    },
    semantic: {
        primary: {
            50: '{caramel.50}',
            100: '{caramel.100}',
            200: '{caramel.200}',
            300: '{caramel.300}',
            400: '{caramel.400}',
            500: '{caramel.500}',
            600: '{caramel.600}',
            700: '{caramel.700}',
            800: '{caramel.800}',
            900: '{caramel.900}',
            950: '{caramel.950}',
        },
        colorScheme: {
            light: {
                surface: {
                    0: '#FFFFFF',
                    50: '#FAF8F3',
                    100: '#EDF1E9',
                    200: '#E8E2D7',
                    300: '#D6CEC0',
                    400: '#A8B59A',
                    500: '#75685B',
                    600: '#526549',
                    700: '#433528',
                    800: '#352A20',
                    900: '#281F17',
                    950: '#1B1510',
                },
                primary: {
                    color: '#A65C25',
                    contrastColor: '#FFFFFF',
                    hoverColor: '#88471B',
                    activeColor: '#713A18',
                },
                highlight: {
                    background: '#EDF1E9',
                    focusBackground: '#DCE4D5',
                    color: '#526549',
                    focusColor: '#433528',
                },
                text: {
                    color: '#433528',
                    hoverColor: '#433528',
                    mutedColor: '#75685B',
                    hoverMutedColor: '#433528',
                },
                content: {
                    background: '#FFFFFF',
                    hoverBackground: '#FAF8F3',
                    borderColor: '#E8E2D7',
                    color: '#433528',
                    hoverColor: '#433528',
                },
                formField: {
                    background: '#FFFFFF',
                    disabledBackground: '#FAF8F3',
                    filledBackground: '#FAF8F3',
                    filledHoverBackground: '#FAF8F3',
                    filledFocusBackground: '#FFFFFF',
                    borderColor: '#E8E2D7',
                    hoverBorderColor: '#A8B59A',
                    focusBorderColor: '#A65C25',
                    invalidBorderColor: '#C53030',
                    color: '#433528',
                    disabledColor: '#75685B',
                    placeholderColor: '#75685B',
                    invalidPlaceholderColor: '#C53030',
                    floatLabelColor: '#75685B',
                    floatLabelFocusColor: '#A65C25',
                    floatLabelActiveColor: '#75685B',
                    floatLabelInvalidColor: '#C53030',
                    iconColor: '#75685B',
                },
                navigation: {
                    item: {
                        focusBackground: '#EDF1E9',
                        activeBackground: '#EDF1E9',
                        color: '#433528',
                        focusColor: '#A65C25',
                        activeColor: '#A65C25',
                        icon: {
                            color: '#75685B',
                            focusColor: '#A65C25',
                            activeColor: '#A65C25',
                        },
                    },
                },
            },
        },
    },
});

export default CozyReadsPreset;
