import { TextureOption } from "./type";
export declare class Viewer3D {
    private _rFID;
    private _camera;
    private _scene;
    private _light;
    private _lightBack;
    private _ambientLight;
    private _model?;
    private _modelGroup;
    private _raycaster;
    private _mouseHelper;
    private _renderer?;
    private _intersection;
    private _controls;
    private _boundaryList;
    private _layerMap;
    private _loader;
    private _selectedBoundary;
    private _isPointerDown;
    private _textureLoader;
    private _crystalizeStyleList;
    private _decalTexture;
    private _canvasWidth;
    private _canvasHeight;
    private _onBoundarySelectionChanged?;
    private _onArtworkSelectionChanged?;
    private _onArtworkMove?;
    private _isInDeveloperMode;
    private _shouldRotate;
    private _resizeObserver;
    constructor(canvas: HTMLCanvasElement);
    private _onCanvasSizeUpdated;
    private _getIntersects;
    private _getPointerIntersection;
    private _enableControls;
    private _disableControls;
    private _fitCameraToObject;
    private _getMousePosition;
    private _onMouseUp;
    private _onMouseDown;
    private _onMouseOver;
    private _onArtworkClick;
    private _loadDecalTexture;
    private _getControl;
    private _generateViewerCopy;
    private _prepareForScreenshot;
    show: () => void;
    hide: () => void;
    loadModel: (url: string, onProgress: (percent: number) => void) => Promise<void>;
    addEventListeners: (options: {
        onBoundarySelectionChanged: () => void;
        onArtworkSelectionChanged: () => void;
        onArtworkMoved: () => void;
    }) => void;
    toggleDeveloperMode: () => void;
    configureModel: (options: {
        colorMap: {
            layerName: string;
            color: string;
        }[];
        artworkMap: {
            boundaryName: string;
            coodinate: {
                x: number;
                y: number;
                z: number;
            };
            rotation: number;
            size: number;
            artworkUrl: string;
            textureApplication: {
                color: string;
                textureOption: TextureOption;
            }[];
        }[];
    }) => void;
    validate: (layers: string[], boundaries: string[]) => void;
    selectBoundary: (boundary: string) => void;
    unselectBoundary: () => void;
    changeArtwork: (options: {
        boundary: string;
        coodinate: {
            x: number;
            y: number;
            z: number;
        };
        rotation: number;
        size: number;
        artworkUrl: string;
    }) => void;
    resetArtworkToDefault: (boundary: string) => void;
    removeArtwork: (boundary: string) => void;
    resetArtworkTextureToDefault: (boundary: string) => void;
    resizeArtworkOnBoundary: (boundary: string, size: number) => void;
    toggleAutoRotate: () => void;
    exportData: () => void;
    changeColor: (layerName: string, color: string) => void;
    takeScreenShot: () => string;
    takeSnapshotAt: (angleY: number) => string;
    takeScreenShotAuto: () => string[];
    changeArtworkTexture: (boundary: string, color: string, textureOption: TextureOption | null) => void;
}
