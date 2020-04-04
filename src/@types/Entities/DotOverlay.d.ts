
export interface OverlayConfig {
    font: string;
    fontSize: number;
    variant: string;
    winColor: string;
    dividerColor: string;
    lossColor: string;

    showBackground: boolean;
    backgroundAlign: 'left' | 'right' | 'center';

    winX: number;
    winY: number;

    lossX: number;
    lossY: number;

    dividerX: number;
    dividerY: number;
}