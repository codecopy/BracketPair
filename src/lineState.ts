import * as vscode from "vscode";
import BracketPair from "./bracketPair";
import ColorMode from "./colorMode";
import ColorIndexes from "./IColorIndexes";
import ModifierPair from "./modifierPair";
import MultipleIndexes from "./multipleIndexes";
import Scope from "./scope";
import ScopePattern from "./scopePattern";
import Settings from "./settings";
import SingularIndex from "./singularIndex";

export default class LineState {
    public activeScope: ScopePattern | null;
    private colorIndexes: ColorIndexes;
    private previousBracketColor: string;
    private readonly settings: Settings;

    constructor(settings: Settings,
                previousState?:
            {
                colorIndexes: ColorIndexes;
                previousBracketColor: string;
                activeScope: ScopePattern | null;
            }) {
        this.settings = settings;

        if (previousState !== undefined) {
            this.colorIndexes = previousState.colorIndexes;
            this.previousBracketColor = previousState.previousBracketColor;
            this.activeScope = previousState.activeScope;
        }
        else {
            switch (settings.colorMode) {
                case ColorMode.Consecutive: this.colorIndexes = new SingularIndex();
                    break;
                case ColorMode.Independent: this.colorIndexes = new MultipleIndexes(settings);
                    break;
                default: throw new RangeError("Not implemented enum value");
            }
        }
    }

    public getScope(position: vscode.Position): Scope | undefined {
        return this.colorIndexes.getScope(position);
    }

    public getOpenBracketColor(bracketPair: BracketPair, range: vscode.Range): string {
        let colorIndex: number;

        if (this.settings.forceIterationColorCycle) {
            colorIndex = (this.colorIndexes.getPreviousIndex(bracketPair) + 1) % bracketPair.colors.length;
        }
        else {
            colorIndex = this.colorIndexes.getCurrentLength(bracketPair) % bracketPair.colors.length;
        }

        let color = bracketPair.colors[colorIndex];

        if (this.settings.forceUniqueOpeningColor && color === this.previousBracketColor) {
            colorIndex = (colorIndex + 1) % bracketPair.colors.length;
            color = bracketPair.colors[colorIndex];
        }

        this.previousBracketColor = color;
        this.colorIndexes.setCurrent(bracketPair, range, colorIndex);

        return color;
    };

    public getCloseBracketColor(bracketPair: BracketPair, range: vscode.Range): string {
        const colorIndex = this.colorIndexes.getCurrentColorIndex(bracketPair, range);
        let color: string;
        if (colorIndex !== undefined) {
            color = bracketPair.colors[colorIndex];
        }
        else {
            color = bracketPair.orphanColor;
        }

        this.previousBracketColor = color;

        return color;
    }

    public copyMultilineContext(): LineState {
        let scope = null;

        if (this.activeScope && this.activeScope.closer) {
            scope = this.activeScope;
        }

        const clone =
            {
                activeScope: scope,
                colorIndexes: this.colorIndexes.clone(),
                previousBracketColor: this.previousBracketColor,
            };

        return new LineState(this.settings, clone);
    }
}
