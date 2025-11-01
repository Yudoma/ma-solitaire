document.addEventListener('DOMContentLoaded', () => {

    // ⭐ 新規追加: ドキュメント全体の右クリックを無効化 (ブラウザデフォルトメニュー防止)
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // ===== ⭐ここから追加 (ドラッグ無効化 1/6) =====
    // 意図しないドロップ（スロット外やウィンドウ外）を防ぐためのグローバルリスナー
    
    // 1. dragover: デフォルトではドロップを禁止する
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        // ドロップ不可であることを示すカーソル（'not-allowed'）を明示的に設定
        // ただし、'text/plain' (カードドラッグ) または 'Files' (ファイルドラッグ) がある場合のみ
        if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('Files')) {
            e.dataTransfer.dropEffect = 'none';
        }
    });

    // 2. drop: デフォルトではドロップを無効化する
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        // ここで dropEffect を 'none' にしても、drop イベント自体は発生してしまう
        // 重要なのは、スロットやラッパー以外の場所で drop が発生したら、
        // (デフォルトの e.preventDefault() により) ブラウザのデフォルト動作（ファイルを開くなど）を防ぐこと。
    });
    // ===== ⭐ここまで追加 =====
    
    // =====================================================
    // 1. グローバル変数・定数
    // =====================================================
    
    // ⭐ グローバル: ボード間で共有されるドラッグ中のアイテム
    let draggedItem = null; 
    
    // ⭐ グローバル: 回転を許可しないゾーンの「ベースID」リスト
    const nonRotatableZones = ['deck', 'grave', 'exclude', 'hand-zone', 'deck-back-slots', 'side-deck', 'grave-back-slots', 'exclude-back-slots', 'side-deck-back-slots']; 
    
    // ⭐ グローバル: 装飾モードの対象となるゾーンの「ベースID」リスト
    const decorationZones = ['exclude', 'side-deck', 'grave', 'deck'];

    // ⭐ 新規追加: スタック（重ね）を許可するゾーンの「ベースID」リスト
    const stackableZones = ['battle', 'spell', 'mana', 'special1', 'special2'];

    // ⭐ 新規追加: カスタムコンテキストメニュー
    const contextMenu = document.getElementById('custom-context-menu');
    
    // ===== ⭐ここから変更 (メモ機能 1/8) =====
    // ⭐ 修正: メニューアイテムをすべて取得
    const deleteMenuItem = document.getElementById('context-menu-delete');
    const toGraveMenuItem = document.getElementById('context-menu-to-grave');
    const toExcludeMenuItem = document.getElementById('context-menu-to-exclude');
    const toHandMenuItem = document.getElementById('context-menu-to-hand');
    const toDeckMenuItem = document.getElementById('context-menu-to-deck');
    const toSideDeckMenuItem = document.getElementById('context-menu-to-side-deck');
    const flipMenuItem = document.getElementById('context-menu-flip'); 
    const memoMenuItem = document.getElementById('context-menu-memo'); // メモ編集
    const addCounterMenuItem = document.getElementById('context-menu-add-counter');
    const removeCounterMenuItem = document.getElementById('context-menu-remove-counter');

    // ⭐ 修正: 現在の右クリック対象に対するアクションを保持するハンドラ
    let currentDeleteHandler = null; 
    let currentMoveToGraveHandler = null;
    let currentMoveToExcludeHandler = null;
    let currentMoveToHandHandler = null;
    let currentMoveToDeckHandler = null;
    let currentMoveToSideDeckHandler = null;
    let currentFlipHandler = null; 
    let currentMemoHandler = null; // メモ編集ハンドラ
    let currentAddCounterHandler = null;
    let currentRemoveCounterHandler = null;

    // ⭐ 新規追加: メモ編集モーダルとツールチップの要素
    const memoEditorModal = document.getElementById('memo-editor');
    const memoTextarea = document.getElementById('memo-editor-textarea');
    const memoSaveBtn = document.getElementById('memo-editor-save');
    const memoCancelBtn = document.getElementById('memo-editor-cancel');
    const memoTooltip = document.getElementById('memo-tooltip');
    let currentMemoTarget = null; // メモ編集対象のサムネイル
    // ===== ⭐ここまで変更 =====

    // ===== ⭐ここから変更 (メモ機能 2/8) =====
    if (!contextMenu || !deleteMenuItem || !toGraveMenuItem || !toExcludeMenuItem || !toHandMenuItem || !toDeckMenuItem || !toSideDeckMenuItem || !flipMenuItem || !addCounterMenuItem || !removeCounterMenuItem
        || !memoMenuItem || !memoEditorModal || !memoTextarea || !memoSaveBtn || !memoCancelBtn || !memoTooltip) { // メモ関連のチェック
        console.error("カスタムコンテキストメニューまたはメモ編集モーダルの必須要素が見つかりません。");
        return; 
    }
    // ===== ⭐ここまで変更 =====

    /**
     * ⭐ 新規追加: コンテキストメニューを閉じ、すべてのハンドラをリセットする関数
     */
    function closeContextMenu() {
        contextMenu.style.display = 'none';
        currentDeleteHandler = null;
        currentMoveToGraveHandler = null;
        currentMoveToExcludeHandler = null;
        currentMoveToHandHandler = null;
        currentMoveToDeckHandler = null;
        currentMoveToSideDeckHandler = null;
        currentFlipHandler = null; 
        // ===== ⭐ここから変更 (メモ機能 3/8) =====
        currentMemoHandler = null;
        // ===== ⭐ここまで変更 =====
        currentAddCounterHandler = null;
        currentRemoveCounterHandler = null;
    }

    // メニュー外クリックでメニューを閉じる
    document.addEventListener('click', (e) => {
        // メニュー自身がクリックされた場合は閉じない (各ボタンの処理に任せる)
        if (e.target.closest('#custom-context-menu')) return;
        
        // ===== ⭐ここから変更 (メモ機能 4/8) =====
        // メモモーダルが表示されている場合は、モーダル外クリックで閉じない
        if (memoEditorModal.style.display === 'block') {
            // モーダル自身やそのボタンがクリックされた場合も閉じない
            if (e.target.closest('#memo-editor')) {
                return;
            }
            // (オプション: モーダル外クリックでキャンセル動作をさせたい場合は、ここで cancel 処理を呼ぶ)
            // performMemoCancel(); 
            return; // ここでは閉じない仕様にする
        }
        // ===== ⭐ここまで変更 =====
        
        closeContextMenu(); 
    });
    
    // メニューのデフォルトのコンテキストメニューを無効化
    contextMenu.addEventListener('contextmenu', (e) => e.preventDefault());

    // ⭐ 修正: 各メニューアイテムのクリック処理
    deleteMenuItem.addEventListener('click', () => {
        if (typeof currentDeleteHandler === 'function') {
            currentDeleteHandler(); // 保持していた削除処理を実行
        }
        closeContextMenu();
    });

    toGraveMenuItem.addEventListener('click', () => {
        if (typeof currentMoveToGraveHandler === 'function') {
            currentMoveToGraveHandler();
        }
        closeContextMenu();
    });

    toExcludeMenuItem.addEventListener('click', () => {
        if (typeof currentMoveToExcludeHandler === 'function') {
            currentMoveToExcludeHandler();
        }
        closeContextMenu();
    });

    toHandMenuItem.addEventListener('click', () => {
        if (typeof currentMoveToHandHandler === 'function') {
            currentMoveToHandHandler();
        }
        closeContextMenu();
    });

    toDeckMenuItem.addEventListener('click', () => {
        if (typeof currentMoveToDeckHandler === 'function') {
            currentMoveToDeckHandler();
        }
        closeContextMenu();
    });

    toSideDeckMenuItem.addEventListener('click', () => {
        if (typeof currentMoveToSideDeckHandler === 'function') {
            currentMoveToSideDeckHandler();
        }
        closeContextMenu();
    });

    flipMenuItem.addEventListener('click', () => { 
        if (typeof currentFlipHandler === 'function') {
            currentFlipHandler();
        }
        closeContextMenu();
    });

    // ===== ⭐ここから変更 (メモ機能 5/8) =====
    memoMenuItem.addEventListener('click', () => {
        if (typeof currentMemoHandler === 'function') {
            currentMemoHandler();
        }
        // メモモーダルが開くので、ここではコンテキストメニューのみを閉じる
        closeContextMenu();
    });
    // ===== ⭐ここまで変更 =====

    addCounterMenuItem.addEventListener('click', () => {
        if (typeof currentAddCounterHandler === 'function') {
            currentAddCounterHandler();
        }
        closeContextMenu();
    });

    removeCounterMenuItem.addEventListener('click', () => {
        if (typeof currentRemoveCounterHandler === 'function') {
            currentRemoveCounterHandler();
        }
        closeContextMenu();
    });
    
    // ===== ⭐ここから追加 (メモ機能 6/8) =====
    // メモ編集モーダルのボタン処理 (グローバル)
    
    function performMemoSave() {
        if (currentMemoTarget) {
            const newMemo = memoTextarea.value;
            if (newMemo) {
                currentMemoTarget.dataset.memo = newMemo;
            } else {
                delete currentMemoTarget.dataset.memo; // メモが空なら属性ごと削除
            }
        }
        memoEditorModal.style.display = 'none';
        currentMemoTarget = null;
    }
    
    function performMemoCancel() {
        memoEditorModal.style.display = 'none';
        currentMemoTarget = null;
    }

    memoSaveBtn.addEventListener('click', performMemoSave);
    memoCancelBtn.addEventListener('click', performMemoCancel);
    
    // メモツールチップの追従 (グローバル)
    document.addEventListener('mousemove', (e) => {
        if (memoTooltip.style.display === 'block') {
            // マウスカーソルの少し右下に表示
            memoTooltip.style.left = (e.pageX + 10) + 'px';
            memoTooltip.style.top = (e.pageY + 10) + 'px';
            
            // 画面端からはみ出ないように調整 (簡易版)
            const rect = memoTooltip.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                memoTooltip.style.left = (e.pageX - rect.width - 10) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                memoTooltip.style.top = (e.pageY - rect.height - 10) + 'px';
            }
        }
    });
    // ===== ⭐ここまで追加 =====


    // =====================================================
    // 2. グローバル・ユーティリティ関数 (DOMのみに依存)
    // =====================================================

    /**
     * ⭐ 新規追加: プレフィックス付きIDからベースIDを取得 (例: 'opponent-deck' -> 'deck')
     */
    function getBaseId(prefixedId) {
        if (!prefixedId) return null;
        return prefixedId.replace('opponent-', '');
    }

    /**
     * ⭐ 既存: CSS変数からカードの幅と高さを取得する関数
     */
    function getCardDimensions() {
        const rootStyles = getComputedStyle(document.documentElement);
        const width = parseFloat(rootStyles.getPropertyValue('--card-width').replace('px', '')) || 70;
        const height = parseFloat(rootStyles.getPropertyValue('--card-height').replace('px', '')) || 124.7;
        return { width, height };
    }
    
    /**
     * ⭐ 既存: Fisher-Yatesシャッフルアルゴリズム
     */
    function shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]
            ];
        }
        return array;
    }

    /**
     * ⭐ 既存: スロットをデフォルトの縦向きサイズに戻す関数
     */
    function resetSlotToDefault(slotElement) {
        slotElement.classList.remove('rotated-90');
        const imgElement = slotElement.querySelector('.thumbnail img');
        if (imgElement) {
            imgElement.style.transform = `rotate(0deg)`;
            imgElement.dataset.rotation = 0;
        }
    }
    
    /**
     * ⭐ 既存: ターゲットスロットの既存のサムネイルを取得する関数
     */
    function getExistingThumbnail(slotElement) {
        // ⭐ 修正: 複数のサムネイルが存在する場合、一番上のものを取得する
        const thumbnails = slotElement.querySelectorAll('.thumbnail');
        if (thumbnails.length > 0) {
            // querySelectorAll はDOM順（通常は最後に追加されたものが一番上）
            // ドラッグ操作のために、一番手前の要素 (z-indexが最も高い = 最後の子要素) を返す
            return thumbnails[thumbnails.length - 1]; 
        }
        return null;
    }

    /**
     * ⭐ 修正: 親ゾーンIDを取得する共通関数 (両方のボードに対応)
     */
    function getParentZoneId(slotElement) {
        
        // 1. 裏面スロット (sidebar-slot-area) を先にチェック
        const backSlotArea = slotElement.closest('.sidebar-slot-area');
        if (backSlotArea) {
            return backSlotArea.id; // (e.g., 'deck-back-slots' or 'opponent-deck-back-slots')
        }
        
        // ⭐新規追加: 2. フリースペース (sidebar-bottom-half) をチェック
        const freeSpaceArea = slotElement.closest('.sidebar-bottom-half');
        if (freeSpaceArea) {
            return freeSpaceArea.id; // (e.g., 'free-space-slots' or 'opponent-free-space-slots')
        }

        // 3. ⭐修正: 手札ゾーンをクラス名でチェック (元の2)
        const handZone = slotElement.closest('.hand-zone-slots');
        if (handZone) {
            return handZone.id; // (e.g., 'hand-zone' or 'opponent-hand-zone')
        }

        // 4. メインボード上のゾーン (battle, mana, deck, grave, etc.) をチェック (元の3)
        const parentZone = slotElement.closest('.zone');
        if (parentZone) {
            return parentZone.id; // (e.g., 'battle' or 'opponent-battle')
        }

        // 5. どのゾーンにも属さない場合 (フォールバック) (元の4)
        let parentZoneId = null;
        const grandParent = slotElement.parentNode.parentNode;
        
        if (grandParent && grandParent.id) {
            parentZoneId = grandParent.id;
        } 
        // ⭐修正: 手札ゾーンのフォールバックをクラス名でチェック
        else if (slotElement.parentNode.classList.contains('hand-zone-slots')) {
            parentZoneId = slotElement.parentNode.id; 
        } 
        else if (slotElement.parentNode.classList.contains('deck-back-slot-container')) {
            const container = slotElement.parentNode;
            if (container.parentNode.parentNode.id) { // .sidebar-slot-area の ID を取得
                parentZoneId = container.parentNode.parentNode.id; 
            }
        }
        // ⭐新規追加: フリースペースのフォールバック
        else if (slotElement.parentNode.classList.contains('free-space-slot-container')) {
             const container = slotElement.parentNode;
             if (container.parentNode.id) { // .sidebar-bottom-half の ID を取得
                parentZoneId = container.parentNode.id;
             }
        }
        else if (slotElement.parentNode.parentNode.classList.contains('hand-controls-top-wrapper')) {
            parentZoneId = slotElement.id; 
        } 
        else if (slotElement.id) {
            // ⭐修正: メインゾーンスロット自身をベースIDでチェック
            if (['deck', 'grave', 'exclude', 'side-deck'].includes(getBaseId(slotElement.id))) {
                parentZoneId = slotElement.id;
            }
        }
        
        if (parentZoneId) {
             return parentZoneId;
        }

        return null; // 不明
    }

    /**
     * ⭐ 新規追加: カードの反転状態をリセット（表側に戻す）する関数
     */
    function resetCardFlipState(thumbnailElement) {
        if (!thumbnailElement || thumbnailElement.dataset.isFlipped !== 'true') {
            return;
        }
        
        const originalSrc = thumbnailElement.dataset.originalSrc;
        const imgElement = thumbnailElement.querySelector('.card-image');
        
        if (imgElement && originalSrc) {
            imgElement.src = originalSrc;
            thumbnailElement.dataset.isFlipped = 'false';
            delete thumbnailElement.dataset.originalSrc;
        }
    }


    // =====================================================
    // 3. ボード初期化関数 (メインロジック)
    // =====================================================
    
    /**
     * ⭐ 新規追加: 指定されたラッパーとIDプレフィックスに基づいてボードの全機能を初期化する
     * @param {string} wrapperSelector - '.player-wrapper' または '.opponent-wrapper'
     * @param {string} idPrefix - '' または 'opponent-'
     */
    function initializeBoard(wrapperSelector, idPrefix) {
        
        const wrapperElement = document.querySelector(wrapperSelector);
        if (!wrapperElement) {
            console.error("ラッパー要素が見つかりません:", wrapperSelector);
            return;
        }

        // --- インスタンス固有の状態変数 ---
        let isDecorationMode = false;
        let lpDecreaseTimer = null;
        let manaDecreaseTimer = null;

        // --- インスタンス固有のDOM要素 ---
        const cardSlots = wrapperElement.querySelectorAll('.card-slot');
        const cardPreviewArea = document.getElementById(idPrefix + 'card-preview');
        const decorationModeBtn = document.getElementById(idPrefix + 'decoration-mode-btn'); 
        const lpAutoDecreaseBtn = document.getElementById(idPrefix + 'lp-auto-decrease-btn');
        const manaAutoDecreaseBtn = document.getElementById(idPrefix + 'mana-auto-decrease-btn');
        const lpCounterValueElement = document.getElementById(idPrefix + 'counter-value');
        const manaCounterValueElement = document.getElementById(idPrefix + 'mana-counter-value');
        const turnCounterValueElement = document.getElementById(idPrefix + 'turn-counter-value'); // ⭐新規追加
        
        // ⭐新規追加: S/Mトグルボタン
        const smToggleBtn = document.getElementById(idPrefix + 'sm-toggle-btn');
        
        const handZoneId = idPrefix + 'hand-zone'; 
        const deckBackSlotsId = idPrefix + 'deck-back-slots'; 
        const handZone = document.getElementById(handZoneId);
        const deckBackSlotsContainer = document.getElementById(deckBackSlotsId);

        // ⭐新規追加: フリースペースのスロットを取得
        const freeSpaceSlotsContainer = document.getElementById(idPrefix + 'free-space-slots');
        let freeSpaceSlots = [];
        if (freeSpaceSlotsContainer) {
            // ⭐修正: フリースペース内のスロットのみを対象にする
            freeSpaceSlots = freeSpaceSlotsContainer.querySelectorAll('.card-slot');
        }
        
        // 存在チェック
        if (!cardPreviewArea || !lpCounterValueElement || !manaCounterValueElement || !turnCounterValueElement || !handZone || !deckBackSlotsContainer) { // ⭐修正
            console.warn(`初期化スキップ: ${wrapperSelector} の必須要素が見つかりません。`);
            return;
        }
        
        const deckBackSlots = deckBackSlotsContainer.querySelector('.deck-back-slot-container');
        if (!deckBackSlots) {
            console.warn(`初期化スキップ: ${wrapperSelector} の .deck-back-slot-container が見つかりません。`);
            return;
        }

        // -----------------------------------------------------
        // 4. インスタンス固有のヘルパー関数 (スコープ内の変数に依存)
        // -----------------------------------------------------
        
        /**
         * ⭐ 新規追加: スロットのスタック状態（.stacked クラス）を更新する関数
         */
        function updateSlotStackState(slotElement) {
            if (!slotElement) return;
            
            // data-is-decoration="true" のカードはスタック数にカウントしない
            const thumbnailCount = slotElement.querySelectorAll('.thumbnail:not([data-is-decoration="true"])').length;
            
            if (thumbnailCount > 1) {
                slotElement.classList.add('stacked');
            } else {
                slotElement.classList.remove('stacked');
            }
        }


        /**
         * ⭐ 修正: 指定されたコンテナ内のカードを左に詰める関数 (手札/裏面スロット用)
         * (L142)
         */
        function arrangeSlots(containerId) {
            const container = document.getElementById(containerId); // containerId は 'opponent-deck-back-slots' のようにプレフィックス付きで渡される
            if (!container) return;
            
            // ⭐修正: containerId のベースIDをチェック
            const baseId = getBaseId(containerId);
            
            // ⭐修正: フリースペースは対象外
            if (baseId === 'free-space-slots') {
                return;
            }
            
            const slotsContainer = (baseId === 'hand-zone') ? container : container.querySelector('.deck-back-slot-container') || container;
            
            const slots = Array.from(slotsContainer.querySelectorAll('.card-slot'));
            let cardThumbnails = [];

            // 1. 全てのスロットからカードを収集し、スロットを空にする
            slots.forEach(slot => {
                // ⭐修正: スタックされているカードをすべて収集
                const thumbnails = slot.querySelectorAll('.thumbnail');
                thumbnails.forEach(thumbnail => {
                    slot.removeChild(thumbnail);
                    cardThumbnails.push(thumbnail);
                });
                
                if (thumbnails.length > 0) {
                    resetSlotToDefault(slot); 
                    updateSlotStackState(slot); // ⭐ 追加: スロットを空にする際もスタック解除
                }
            });

            // 2. カードを先頭のスロットから順に再配置する
            for (let i = 0; i < cardThumbnails.length; i++) {
                if (slots[i]) {
                    slots[i].appendChild(cardThumbnails[i]);
                    const imgElement = cardThumbnails[i].querySelector('.card-image');
                    if (imgElement) {
                        imgElement.style.transform = `rotate(0deg)`;
                        imgElement.dataset.rotation = 0;
                    }
                    updateSlotStackState(slots[i]); // ⭐ 追加: 配置後もスタック更新 (通常は1枚だが念のため)
                }
            }
        }

        /**
         * ⭐ 修正: LPカウンター更新の共通関数
         * (L962)
         */
        function updateLPCounterValue(valueChange) {
            let currentValue = parseInt(lpCounterValueElement.value) || 0;
            currentValue += valueChange;
            if (currentValue < 0) currentValue = 0; 
            lpCounterValueElement.value = currentValue;
        }

        /**
         * ⭐ 修正: マナカウンター更新の共通関数
         * (L976)
         */
        function updateManaCounterValue(newValue) {
            let value = Math.max(0, newValue); 
            manaCounterValueElement.value = value;
        }

        /**
         * ⭐ 新規追加: ターンカウンター更新の共通関数
         */
        function updateTurnCounterValue(newValue) {
            let value = Math.max(0, newValue); // 最小値を1に設定
            turnCounterValueElement.value = value;
        }

        /**
         * ⭐ 修正: メインゾーンの画像と枚数を同期する関数
         * (L1200)
         * @param {string} baseZoneId - 'deck', 'grave' などのプレフィックスなしのベースID
         */
        function syncMainZoneImage(baseZoneId) {
            // ⭐修正: プレフィックス付きIDを構築
            const mainZone = document.getElementById(idPrefix + baseZoneId);
            if (!mainZone) return;

            const mainSlot = mainZone.querySelector('.card-slot');
            if (!mainSlot) return;

            // ⭐修正: プレフィックス付きIDを構築
            const backSlotsId = `${idPrefix}${baseZoneId}-back-slots`;
            const backSlotsContainer = document.getElementById(backSlotsId);
            
            // ⭐修正: フリースペースは対象外
            if (baseZoneId === 'free-space-slots') {
                return;
            }
            
            const backSlots = backSlotsContainer ? backSlotsContainer.querySelector('.deck-back-slot-container') : null;
            
            // ⭐修正: スタックを考慮し、サムネイルの総数をカウント
            const occupiedThumbnails = backSlots ? Array.from(backSlots.querySelectorAll('.thumbnail')) : [];
            const cardCount = occupiedThumbnails.length;
            
            let countOverlay = mainSlot.querySelector('.count-overlay');
            if (!countOverlay) {
                countOverlay = document.createElement('div');
                countOverlay.classList.add('count-overlay');
                mainSlot.appendChild(countOverlay);
            }
            
            const decoratedThumbnail = mainSlot.querySelector('.thumbnail[data-is-decoration="true"]');
            const decoratedImg = decoratedThumbnail ? decoratedThumbnail.querySelector('img') : null;

            countOverlay.textContent = cardCount;
            countOverlay.style.display = cardCount > 0 ? 'block' : 'none';

            let targetCardThumbnail = null;
            if (cardCount > 0) {
                if (baseZoneId === 'deck' || baseZoneId === 'side-deck') {
                    // 1枚目 (一番下) のカード
                    targetCardThumbnail = occupiedThumbnails[0];
                } else if (baseZoneId === 'grave' || baseZoneId === 'exclude') {
                    // 最後 (一番上) のカード
                    targetCardThumbnail = occupiedThumbnails[occupiedThumbnails.length - 1];
                }
            }
            
            let mainSlotImg = mainSlot.querySelector('img.zone-image');
            
            if (!mainSlotImg) {
                mainSlotImg = document.createElement('img');
                mainSlotImg.classList.add('zone-image');
                mainSlotImg.setAttribute('draggable', false);
                mainSlotImg.addEventListener('dragstart', (e) => e.preventDefault());
                
                if (countOverlay) {
                    mainSlot.insertBefore(mainSlotImg, countOverlay);
                } else {
                    mainSlot.appendChild(mainSlotImg);
                }
            }
            
            if (decoratedImg) {
                if (mainSlotImg) {
                    mainSlotImg.style.display = 'none';
                }
                decoratedThumbnail.style.display = 'block';
                decoratedImg.style.display = 'block'; 
                mainSlot.dataset.hasCard = 'true'; 

            } else if (targetCardThumbnail) {
                if (decoratedThumbnail) {
                    decoratedThumbnail.style.display = 'none';
                }
                if (mainSlotImg) {
                     const cardImg = targetCardThumbnail.querySelector('.card-image');
                     
                     // ⭐ 修正: 反転している場合は元の画像(originalSrc)を表示する
                     if (targetCardThumbnail.dataset.isFlipped === 'true') {
                         mainSlotImg.src = targetCardThumbnail.dataset.originalSrc;
                     } else {
                         mainSlotImg.src = cardImg.src;
                     }
                     
                     mainSlotImg.style.display = 'block'; 
                     mainSlot.dataset.hasCard = 'true'; 
                }
                
            } else {
                if (decoratedThumbnail) {
                    decoratedThumbnail.style.display = 'none';
                }
                if (mainSlotImg) {
                    mainSlotImg.src = '';
                    mainSlotImg.style.display = 'none'; 
                }
                mainSlot.dataset.hasCard = 'false'; 
            }
        }
        
        /**
         * ⭐ 新規追加: カードを指定のマルチゾーン（手札/デッキ/墓地/除外/EX）へ移動させる関数
         * @param {HTMLElement} thumbnailElement - 移動対象のカード
         * @param {string} targetBaseZoneId - 'hand', 'deck', 'grave', 'exclude', 'side-deck' のいずれか
         */
        function moveCardToMultiZone(thumbnailElement, targetBaseZoneId) {
            const sourceSlot = thumbnailElement.parentNode;
            if (!sourceSlot) return; // すでに削除されている
            
            const sourceZoneId = getParentZoneId(sourceSlot);
            const sourceBaseZoneId = getBaseId(sourceZoneId);
            
            // --- 1. 移動先のコンテナとIDを特定 ---
            const isTargetHand = (targetBaseZoneId === 'hand');
            const destinationMultiZoneId = idPrefix + (isTargetHand ? 'hand-zone' : targetBaseZoneId + '-back-slots');
            
            // --- 2. 移動元と移動先が同じ場合は処理しない ---
            if (sourceBaseZoneId === targetBaseZoneId || sourceZoneId === destinationMultiZoneId) {
                return; 
            }
            
            // --- 3. 移動先の空きスロットを探す ---
            const destinationContainer = document.getElementById(destinationMultiZoneId);
            if (!destinationContainer) {
                console.error(`移動先コンテナ ${destinationMultiZoneId} が見つかりません。`);
                return;
            }
            
            const slotsContainer = isTargetHand ? destinationContainer : destinationContainer.querySelector('.deck-back-slot-container');
            if (!slotsContainer) {
                console.error(`スロットコンテナ ${destinationMultiZoneId} が見つかりません。`);
                return;
            }
            
            const emptySlot = Array.from(slotsContainer.querySelectorAll('.card-slot')).find(s => !s.querySelector('.thumbnail'));

            if (!emptySlot) {
                // alert(`「${targetBaseZoneId}」がいっぱいです。`); // alert は禁止
                console.warn(`「${targetBaseZoneId}」がいっぱいです。`);
                return;
            }

            // --- 4. 移動処理の実行 ---
            
            // a. 移動元の状態を処理 (マナなど)
            const imgElement = thumbnailElement.querySelector('.card-image');
            if (imgElement && sourceBaseZoneId === 'mana') {
                let currentRotation = parseInt(imgElement.dataset.rotation) || 0;
                if (currentRotation === 90) {
                    const currentValue = parseInt(manaCounterValueElement.value) || 0;
                    updateManaCounterValue(currentValue - 1);
                }
            }

            // b. カードをDOMから取り外す
            sourceSlot.removeChild(thumbnailElement);
            resetSlotToDefault(sourceSlot);
            updateSlotStackState(sourceSlot); // 移動元のスタック状態を更新

            // c. カードを新しいスロットに追加
            emptySlot.appendChild(thumbnailElement);
            
            // ⭐ 修正: コンテキストメニュー経由の移動では反転状態をリセット (グローバル関数呼び出し)
            resetCardFlipState(thumbnailElement);
            
            resetSlotToDefault(emptySlot); 
            // updateSlotStackState(emptySlot); // arrangeSlots が行うので不要
            
            // --- 5. 移動元と移動先のUIを更新 ---

            // a. 移動元がマルチゾーンだった場合、再配置
            const sourceIsMultiZone = ['hand-zone', 'deck-back-slots', 'grave-back-slots', 'exclude-back-slots', 'side-deck-back-slots'].includes(sourceBaseZoneId);
            if (sourceIsMultiZone) {
                arrangeSlots(sourceZoneId);
                if (sourceBaseZoneId !== 'hand-zone') {
                    syncMainZoneImage(sourceBaseZoneId.replace('-back-slots', ''));
                }
            } 
            // b. 移動元がメインの装飾ゾーンだった場合、同期
            else if (decorationZones.includes(sourceBaseZoneId)) {
                 syncMainZoneImage(sourceBaseZoneId);
            }
            // c. ⭐修正: 移動元がフリースペースだった場合 (何もしない)
            else if (sourceBaseZoneId === 'free-space-slots') {
                // (スタック更新は b で実施済み)
            }

            // d. 移動先を再配置し、同期 (元の c)
            arrangeSlots(destinationMultiZoneId);
            if (!isTargetHand) {
                syncMainZoneImage(targetBaseZoneId);
            }
        }

        
        /**
         * ⭐ 修正: カードサムネイル生成およびイベント設定関数
         * (L.480)
         * この関数は `isDecorationMode` や `arrangeSlots` など、
         * `initializeBoard` スコープ内の変数・関数に依存するため、内部に定義する。
         * * ⭐ 修正(v1/19): insertAtBottom フラグを追加
         * * ⭐ 修正(v2/インポート対応): cardData オブジェクトまたは imageSrc 文字列を受け取れるように変更
         */
        // function createCardThumbnail(imageSrc, slotElement, isDecoration = false, insertAtBottom = false) { // 元のシグネチャ
        function createCardThumbnail(cardData, slotElement, insertAtBottom = false) {
            
            // ===== ⭐ここから変更 (メモ機能 7/8) =====
            let imageSrc, isDecoration, isFlipped, originalSrc, counter, memo; // memo を追加

            // 互換性のため、呼び出し元が (imageSrc, slotElement, isDecoration, insertAtBottom) の形式で呼び出した場合
            if (typeof cardData === 'string') {
                imageSrc = cardData;
                isDecoration = arguments[2] || false; // 第3引数 (isDecoration)
                insertAtBottom = arguments[3] || false; // 第4引数 (insertAtBottom)
                isFlipped = false;
                originalSrc = null;
                counter = 0;
                memo = ''; // memo を追加
            } else {
                // インポート機能からの呼び出し (オブジェクト形式)
                imageSrc = cardData.src;
                isDecoration = cardData.isDecoration || false;
                isFlipped = cardData.isFlipped || false;
                originalSrc = cardData.originalSrc || null;
                counter = cardData.counter || 0;
                memo = cardData.memo || ''; // memo を追加
                // insertAtBottom は第3引数から取得 (デフォルト false)
            }
            // ===== ⭐ここまで変更 =====
            
            const thumbnailElement = document.createElement('div');
            thumbnailElement.classList.add('thumbnail');
            thumbnailElement.setAttribute('draggable', true); 
            
            if (isDecoration) {
                thumbnailElement.dataset.isDecoration = 'true';
            }

            const imgElement = document.createElement('img');
            imgElement.classList.add('card-image');
            imgElement.dataset.rotation = 0; 
            
            // ⭐ 反転状態の復元 (L.500 付近)
            if (isFlipped && originalSrc) {
                thumbnailElement.dataset.isFlipped = 'true';
                thumbnailElement.dataset.originalSrc = originalSrc;
                imgElement.src = imageSrc; // この imageSrc は裏側画像の src
            } else {
                thumbnailElement.dataset.isFlipped = 'false';
                imgElement.src = imageSrc; // 表側画像の src
            }
                    
            thumbnailElement.appendChild(imgElement);
            
            // ===== ⭐ここから追加 (カウンターオーバーレイの作成) =====
            const counterOverlay = document.createElement('div');
            counterOverlay.classList.add('card-counter-overlay');
            counterOverlay.dataset.counter = counter;
            counterOverlay.textContent = counter;

            if (counter > 0) {
                counterOverlay.style.display = 'flex';
            } else {
                counterOverlay.style.display = 'none';
            }
            thumbnailElement.appendChild(counterOverlay);
            // ===== ⭐ここまで追加 =====
            
            // ===== ⭐ここから追加 (メモ機能 8/8) =====
            // メモデータを data 属性に保存
            if (memo) {
                thumbnailElement.dataset.memo = memo;
            }
            // ===== ⭐ここまで追加 =====
            
            // ⭐ 修正(v1/19): insertAtBottom フラグに応じて挿入位置を変更 (L.512)
            if (insertAtBottom) {
                // スロットの先頭（一番下）に挿入
                const firstCard = slotElement.querySelector('.thumbnail');
                if (firstCard) {
                    slotElement.insertBefore(thumbnailElement, firstCard);
                } else {
                    slotElement.appendChild(thumbnailElement); // スロットが空ならそのまま追加
                }
            } else {
                // 従来通りの動作 (一番上に追加)
                slotElement.appendChild(thumbnailElement); 
            }
            
            const parentZoneId = getParentZoneId(slotElement);
            const baseParentZoneId = getBaseId(parentZoneId); // ⭐修正
            
            // ⭐修正: ベースIDでチェック
            if (baseParentZoneId === 'deck-back-slots' || baseParentZoneId === 'grave-back-slots' || baseParentZoneId === 'exclude-back-slots' || baseParentZoneId === 'side-deck-back-slots') {
                // ⭐修正: ベースIDを渡す
                syncMainZoneImage(baseParentZoneId.replace('-back-slots', ''));
            }
            // ⭐修正: フリースペースは同期対象外
            else if (baseParentZoneId === 'free-space-slots') {
                // 何もしない
            }

            // ----------------------------------------------------
            // 3. ドラッグ＆ドロップ機能
            // ----------------------------------------------------
            
            thumbnailElement.addEventListener('dragstart', (e) => {
                // ⭐修正: このインスタンスの isDecorationMode を参照
                if (thumbnailElement.dataset.isDecoration === 'true' && !isDecorationMode) {
                    e.preventDefault();
                    return;
                }
                
                draggedItem = thumbnailElement; // ⭐ グローバル変数にセット
                setTimeout(() => {
                    thumbnailElement.style.visibility = 'hidden';
                }, 0);
                e.dataTransfer.setData('text/plain', ''); 
            });

            thumbnailElement.addEventListener('dragend', () => {
                thumbnailElement.style.visibility = 'visible';
                draggedItem = null; // ⭐ グローバル変数をクリア
            });

            // ----------------------------------------------------
            // 4. サムネイルのクリックでカードを回転させる機能
            // ----------------------------------------------------
            thumbnailElement.addEventListener('click', (e) => {
                
                // ⭐修正: メニューが表示されている場合は、メニューを閉じる動作を優先し、回転処理を行わない
                // (contextMenu はグローバルスコープから参照)
                if (contextMenu.style.display === 'block') {
                    // document.click イベントが発火するようにここでは stopPropagation しない
                    // document.click ハンドラがメニューを閉じる
                    return;
                }
                
                // ===== ⭐ここから追加 (メモ機能) =====
                // メモモーダルが表示されている場合は、クリックを無視する
                // (memoEditorModal はグローバルスコープから参照)
                if (memoEditorModal.style.display === 'block') {
                    return;
                }
                // ===== ⭐ここまで追加 =====

                if (draggedItem) return; // グローバル変数をチェック
                
                if (thumbnailElement.dataset.isDecoration === 'true') {
                     e.stopPropagation(); 
                    return;
                }

                // ⭐ 修正(v1/19): スタックされている場合、一番上のカード以外は回転させない
                const slotElement = thumbnailElement.parentNode; 
                const topCard = getExistingThumbnail(slotElement); // getExistingThumbnail は一番上のカードを返す
                if (thumbnailElement !== topCard) {
                    e.stopPropagation();
                    return;
                }
                
                const imgElement = thumbnailElement.querySelector('.card-image');
                if (!imgElement) return;

                // const slotElement = thumbnailElement.parentNode; // 上で定義済み
                let parentZoneId = getParentZoneId(slotElement);
                let baseParentZoneId = getBaseId(parentZoneId); // ⭐修正

                // ⭐修正: ベースIDでチェック (フリースペースも回転不可ゾーンに追加)
                if (nonRotatableZones.includes(baseParentZoneId) || baseParentZoneId === 'free-space-slots') {
                    e.stopPropagation(); 
                    return;
                }
                
                // カードの回転処理
                let currentRotation = parseInt(imgElement.dataset.rotation) || 0;
                
                if (currentRotation === 0) {
                    currentRotation = 90;
                    slotElement.classList.add('rotated-90');
                    
                    const { width, height } = getCardDimensions();
                    const scaleFactor = height / width;
                    imgElement.style.transform = `rotate(${currentRotation}deg) scale(${scaleFactor})`;
                    
                    // ⭐修正: ベースIDでチェック
                    if (baseParentZoneId === 'mana') {
                        const currentValue = parseInt(manaCounterValueElement.value) || 0;
                        updateManaCounterValue(currentValue + 1);
                    }
                    
                } else {
                    currentRotation = 0;
                    slotElement.classList.remove('rotated-90');
                    imgElement.style.transform = `rotate(${currentRotation}deg)`;
                }
                
                imgElement.dataset.rotation = currentRotation;
                e.stopPropagation(); 
            });
            
            // ⭐修正: 右クリックでカスタムコンテキストメニューを表示する機能
            thumbnailElement.addEventListener('contextmenu', (e) => {
                e.preventDefault(); 
                e.stopPropagation(); // documentのclickリスナーが発火するのを防ぐ
                
                // ===== ⭐ここから追加 (メモ機能) =====
                // メモモーダルが表示されている場合は、コンテキストメニューも表示しない
                if (memoEditorModal.style.display === 'block') {
                    return;
                }
                // ===== ⭐ここまで追加 =====

                // 実行すべき削除処理を定義
                // (クロージャにより、このボードインスタンスの変数 isDecorationMode, manaCounterValueElement 等を参照)
                const performDelete = () => {
                    // ⭐修正: このインスタンスの isDecorationMode を参照
                    if (thumbnailElement.dataset.isDecoration === 'true' && !isDecorationMode) {
                        return;
                    }
                    
                    const slotElement = thumbnailElement.parentNode;
                    // 既に削除されている場合は何もしない
                    if (!slotElement) return;
                     
                    const parentZoneId = getParentZoneId(slotElement);
                    const baseParentZoneId = getBaseId(parentZoneId); // ⭐修正
                    
                    // ⭐修正: ベースIDでチェック
                    if (baseParentZoneId === 'mana') {
                        const imgElement = thumbnailElement.querySelector('.card-image');
                        let currentRotation = parseInt(imgElement.dataset.rotation) || 0;
                        if (currentRotation === 90) {
                            const currentValue = parseInt(manaCounterValueElement.value) || 0;
                            updateManaCounterValue(currentValue - 1);
                        }
                    }
                    
                    slotElement.removeChild(thumbnailElement);
                    cardPreviewArea.innerHTML = '<p>カードにカーソルを合わせてください</p>'; 
                    resetSlotToDefault(slotElement); 

                    // ⭐ 追加: 削除後のスタック状態を更新
                    updateSlotStackState(slotElement);
                    
                    draggedItem = null; // ⭐ グローバル変数をクリア
                    
                    // ⭐修正: ベースIDでチェック
                    if (baseParentZoneId === 'deck-back-slots' || baseParentZoneId === 'grave-back-slots' || baseParentZoneId === 'exclude-back-slots' || baseParentZoneId === 'side-deck-back-slots') {
                        arrangeSlots(parentZoneId);
                        // ⭐修正: ベースIDを渡す
                        syncMainZoneImage(baseParentZoneId.replace('-back-slots', ''));
                    } else if (baseParentZoneId === 'hand-zone') {
                        arrangeSlots(parentZoneId); // parentZoneId は 'hand-zone' or 'opponent-hand-zone'
                    }
                    else if (thumbnailElement.dataset.isDecoration === 'true') {
                         // ⭐修正: ベースIDを渡す
                         syncMainZoneImage(baseParentZoneId);
                    }
                    // ⭐修正: フリースペースは対象外
                    else if (baseParentZoneId === 'free-space-slots') {
                        // (スタック更新は実施済み)
                    }
                };

                // ===== ⭐ここから追加 (カウンター増減処理) =====
                // (クロージャにより、このボードインスタンスの変数を参照)
                const performAddCounter = () => {
                    const counterOverlay = thumbnailElement.querySelector('.card-counter-overlay');
                    if (!counterOverlay) return;
                    
                    let count = parseInt(counterOverlay.dataset.counter) || 0;
                    count++;
                    
                    counterOverlay.dataset.counter = count;
                    counterOverlay.textContent = count;
                    counterOverlay.style.display = 'flex';
                };
                
                const performRemoveCounter = () => {
                    const counterOverlay = thumbnailElement.querySelector('.card-counter-overlay');
                    if (!counterOverlay) return;
                    
                    let count = parseInt(counterOverlay.dataset.counter) || 0;
                    if (count > 0) {
                        count--;
                    }
                    
                    counterOverlay.dataset.counter = count;
                    counterOverlay.textContent = count;
                    
                    if (count === 0) {
                        counterOverlay.style.display = 'none';
                    }
                };
                // ===== ⭐ここまで追加 =====
                
                // ===== ⭐ここから追加 (メモ機能) =====
                const performMemoEdit = () => {
                    // (グローバル変数を設定)
                    currentMemoTarget = thumbnailElement;
                    // (グローバルなテキストエリアに既存のメモをセット)
                    memoTextarea.value = thumbnailElement.dataset.memo || '';
                    // (グローバルなモーダルを表示)
                    memoEditorModal.style.display = 'block';
                    memoTextarea.focus();
                };
                // ===== ⭐ここまで追加 =====


                // 装飾モードのチェック (メニュー表示の可否)
                // (isDecorationMode は initializeBoard のスコープから取得)
                if (thumbnailElement.dataset.isDecoration === 'true' && !isDecorationMode) {
                    // 装飾カードだが装飾モードでない場合は、メニューも表示しない
                    return;
                }

                // ⭐ 修正: 削除および移動ハンドラをグローバルにセット
                currentDeleteHandler = performDelete;
                currentMoveToGraveHandler = () => moveCardToMultiZone(thumbnailElement, 'grave');
                currentMoveToExcludeHandler = () => moveCardToMultiZone(thumbnailElement, 'exclude');
                currentMoveToHandHandler = () => moveCardToMultiZone(thumbnailElement, 'hand');
                currentMoveToDeckHandler = () => moveCardToMultiZone(thumbnailElement, 'deck');
                currentMoveToSideDeckHandler = () => moveCardToMultiZone(thumbnailElement, 'side-deck');

                // ===== ⭐ここから追加 =====
                currentAddCounterHandler = performAddCounter;
                currentRemoveCounterHandler = performRemoveCounter;
                currentMemoHandler = performMemoEdit; // メモハンドラをセット
                // ===== ⭐ここまで追加 =====

                // ⭐ 新規追加: 反転処理の定義
                const performFlip = () => {
                    const imgElement = thumbnailElement.querySelector('.card-image');
                    if (!imgElement) return;

                    // 1. 現在が裏側かどうかを data 属性で判断
                    const isFlipped = thumbnailElement.dataset.isFlipped === 'true';

                    if (isFlipped) {
                        // 2. 裏側 -> 表側 (グローバル関数呼び出し)
                        resetCardFlipState(thumbnailElement);
                    } else {
                        // 3. 表側 -> 裏側
                        
                        // 3a. デッキの装飾画像（裏側画像）を取得
                        // (idPrefix は initializeBoard のスコープから取得)
                        const deckZone = document.getElementById(idPrefix + 'deck');
                        let deckImgSrc = './decoration/デッキ.png'; // デフォルトのフォールバック
                        
                        if (deckZone) {
                            const decoratedThumbnail = deckZone.querySelector('.thumbnail[data-is-decoration="true"]');
                            if (decoratedThumbnail) {
                                const decoratedImg = decoratedThumbnail.querySelector('.card-image');
                                if (decoratedImg) {
                                    deckImgSrc = decoratedImg.src;
                                }
                            }
                        }
                        
                        // 3b. 元の画像を保存し、画像を切り替え
                        thumbnailElement.dataset.originalSrc = imgElement.src;
                        imgElement.src = deckImgSrc;
                        thumbnailElement.dataset.isFlipped = 'true';
                    }
                    
                    // ⭐ 新規追加: メインゾーンの同期 (反転した場合)
                    const slotElement = thumbnailElement.parentNode;
                    const parentZoneId = getParentZoneId(slotElement);
                    const baseParentZoneId = getBaseId(parentZoneId);
            
                    if (baseParentZoneId === 'deck-back-slots' || baseParentZoneId === 'grave-back-slots' || baseParentZoneId === 'exclude-back-slots' || baseParentZoneId === 'side-deck-back-slots') {
                        syncMainZoneImage(baseParentZoneId.replace('-back-slots', ''));
                    }
                };
                
                // ⭐ 新規追加: 反転ハンドラをセット
                currentFlipHandler = performFlip;


                // ⭐ 新規追加: コンテキストメニューの項目表示を制御
                const sourceZoneId = getParentZoneId(thumbnailElement.parentNode);
                const sourceBaseId = getBaseId(sourceZoneId); // e.g., 'battle', 'mana', 'hand-zone', 'deck-back-slots'

                // 表示/非表示を切り替える内部ヘルパー
                const setItemVisibility = (item, targetBaseId) => {
                    const isTargetHand = (targetBaseId === 'hand');
                    const targetMultiZoneId = isTargetHand ? 'hand-zone' : (targetBaseId + '-back-slots');
                    
                    // 移動元がすでに移動先（またはその実体）である場合は非表示
                    if (sourceBaseId === targetBaseId || sourceBaseId === targetMultiZoneId) {
                        item.style.display = 'none';
                    } else {
                        item.style.display = 'block';
                    }
                };

                // (toGraveMenuItem などはグローバルスコープから参照)
                setItemVisibility(toGraveMenuItem, 'grave');
                setItemVisibility(toExcludeMenuItem, 'exclude');
                setItemVisibility(toHandMenuItem, 'hand');
                setItemVisibility(toDeckMenuItem, 'deck');
                setItemVisibility(toSideDeckMenuItem, 'side-deck');
                
                // ⭐ 修正: 反転メニューの表示制御 (手札ゾーンを許可、フリースペースを禁止)
                // (nonRotatableZones はグローバルスコープから参照)
                const isNonRotatable = nonRotatableZones.includes(sourceBaseId);
                const isHandZone = (sourceBaseId === 'hand-zone');
                const isFreeSpace = (sourceBaseId === 'free-space-slots');
                
                if ((isNonRotatable && !isHandZone) || isFreeSpace || thumbnailElement.dataset.isDecoration === 'true') {
                    // 手札ゾーン以外(isHandZone=false)の回転不可ゾーン(isNonRotatable=true)
                    // またはフリースペース (isFreeSpace=true)
                    // または装飾カードの場合は、反転メニューを非表示
                    flipMenuItem.style.display = 'none';
                } else {
                    // 通常ゾーン、または手札ゾーンの場合は表示
                    flipMenuItem.style.display = 'block';
                }
                
                // ===== ⭐ここから追加 (カウンターとメモの表示制御) =====
                if (thumbnailElement.dataset.isDecoration === 'true') {
                    // 装飾カードはカウンターもメモも不可
                    addCounterMenuItem.style.display = 'none';
                    removeCounterMenuItem.style.display = 'none';
                    memoMenuItem.style.display = 'none';
                } else {
                    // 通常カード
                    memoMenuItem.style.display = 'block';
                    
                    // (stackableZones はグローバルスコープから参照)
                    if (stackableZones.includes(sourceBaseId)) {
                        addCounterMenuItem.style.display = 'block';
                        removeCounterMenuItem.style.display = 'block';
                    } else {
                        addCounterMenuItem.style.display = 'none';
                        removeCounterMenuItem.style.display = 'none';
                    }
                }
                // ===== ⭐ここまで追加 =====
                
                deleteMenuItem.style.display = 'block'; // 削除は常に表示

                // 1. メニューを一時的に表示してサイズを取得
                contextMenu.style.visibility = 'hidden';
                contextMenu.style.display = 'block';
                const menuWidth = contextMenu.offsetWidth;
                const menuHeight = contextMenu.offsetHeight;
                contextMenu.style.display = 'none'; // すぐに非表示に戻す
                contextMenu.style.visibility = 'visible';

                // 2. 座標を計算 (クリック位置を中央にする)
                let left = e.pageX;
                let top = e.pageY - (menuHeight / 2);
                
                // 3. コンテキストメニューを表示
                contextMenu.style.top = `${top}px`;
                contextMenu.style.left = `${left}px`;
                contextMenu.style.display = 'block';
            });
            
            // ----------------------------------------------------
            // 7. ⭐追加: ホバーで全体画像を表示する機能
            // ----------------------------------------------------
            thumbnailElement.addEventListener('mouseover', (e) => {
                
                /*
                // ⭐ 修正(v1/19): スタックされている場合、一番上のカードのみプレビューする
                // ===== ⭐ここから修正 (コメントアウト) =====
                const slotElement = thumbnailElement.parentNode; 
                const topCard = getExistingThumbnail(slotElement);
                if (thumbnailElement !== topCard) {
                    // ホバー対象が一番上でない場合、プレビューエリアをクリア
                    cardPreviewArea.innerHTML = '<p>カードにカーソルを合わせてください</p>';
                    e.stopPropagation();
                    return;
                }
                // ===== ⭐ここまで修正 (コメントアウト) =====
                */

                const imgElement = thumbnailElement.querySelector('.card-image');
                if (!imgElement) return;

                cardPreviewArea.innerHTML = ''; 
                const previewImg = document.createElement('img');
                
                // ⭐ 修正: 反転している場合は元の画像を表示
                if (thumbnailElement.dataset.isFlipped === 'true') {
                    previewImg.src = thumbnailElement.dataset.originalSrc || imgElement.src;
                } else {
                    previewImg.src = imgElement.src;
                }
                
                cardPreviewArea.appendChild(previewImg);
                
                // ===== ⭐ここから追加 (メモ機能) =====
                const memo = thumbnailElement.dataset.memo;
                if (memo) {
                    // (memoTooltip はグローバルスコープから参照)
                    memoTooltip.textContent = memo;
                    memoTooltip.style.display = 'block';
                    // 座標はグローバルな mousemove リスナーが設定する
                }
                // ===== ⭐ここまで追加 =====
                
                e.stopPropagation(); 
            });
            
            // ----------------------------------------------------
            // 8. ⭐追加: ホバー解除でプレビューをリセット
            // ----------------------------------------------------
            // ⭐ ユーザー要望により、プレビューリセット機能は削除/コメントアウトします。
            /*
            thumbnailElement.addEventListener('mouseout', (e) => {
                 cardPreviewArea.innerHTML = '<p>カードにカーソルを合わせてください</p>';
                 e.stopPropagation();
            });
            */
            
            // ===== ⭐ここから追加 (メモ機能) =====
            // メモツールチップ非表示のための mouseout
            thumbnailElement.addEventListener('mouseout', (e) => {
                // (memoTooltip はグローバルスコープから参照)
                memoTooltip.style.display = 'none';
                e.stopPropagation();
            });
            // ===== ⭐ここまで追加 =====
        }

        /**
         * ⭐ 修正: サイドバーの表示/非表示を切り替える関数
         * (L575)
         */
        function toggleSidebarContent(targetId) { // targetId はプレフィックス付き (e.g., 'opponent-deck-back-slots')
            // ⭐修正: このインスタンスのサイドバーコンテナを取得
            const sidebarContainer = document.getElementById(idPrefix + 'sidebar-container');
            if (!sidebarContainer) return;

            const targetElement = document.getElementById(targetId);
            
            // ⭐修正: このインスタンスの「上半分」のサイドバーエリアのみを対象にする
            wrapperElement.querySelectorAll('.sidebar-top-half .sidebar-slot-area').forEach(area => {
                area.style.display = 'none';
            });

            if (targetElement) { 
                targetElement.style.display = 'flex'; 
                sidebarContainer.style.display = 'flex';
            } else {
                sidebarContainer.style.display = 'none';
            }
        }

        /**
         * ⭐ 修正: スロットにイベントリスナーを一括で設定する関数
         * (L593)
         * `draggedItem` (グローバル) と `isDecorationMode` (インスタンス) の両方に依存する
         */
        function addSlotEventListeners(slot) {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                // ===== ⭐ここから変更 (ドラッグ無効化 2/6) =====
                // document レベルの dragover (dropEffect = 'none') が発火するのを止める
                e.stopPropagation(); 
                // このエリアはドロップ可能であることを明示する
                // (ファイルドロップの場合は 'copy' にしたいが、ここではカード/ファイル両方を受け付けるため
                //  ファイルの場合 (Filesタイプ) があれば 'copy' に、なければ 'move' にする)
                if (e.dataTransfer.types.includes('Files')) {
                    e.dataTransfer.dropEffect = 'copy';
                } else {
                    e.dataTransfer.dropEffect = 'move'; 
                }
                // ===== ⭐ここまで変更 =====
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            // ===== ⭐ここから変更 (ファイルドロップ対応) =====
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                // e.stopPropagation(); // ⭐削除: ここでは止めない
                slot.classList.remove('drag-over');

                // ファイルドロップの場合、wrapperElement のリスナー (L.947) に処理を委譲する
                if (e.dataTransfer.files.length > 0) {
                    // e.stopPropagation() を呼ばないことで、イベントが wrapperElement にバブリングする
                    return;
                }
                
                // ここからはカードドラッグ (draggedItem がある) の場合
                e.stopPropagation(); // ⭐移動: カードドラッグの場合のみ document の drop (L.30) を止める

                if (draggedItem) { // ⭐ グローバル変数をチェック
                    
                    // === 装飾カードの移動制限 ===
                    // (isDecorationMode はインスタンススコープから取得)
                    if (draggedItem.dataset.isDecoration === 'true' && !isDecorationMode) {
                        console.log("装飾モードでないため、装飾カードを移動できません。");
                        return;
                    }

                    const sourceSlot = draggedItem.parentNode;
                    const sourceZoneId = getParentZoneId(sourceSlot);
                    const sourceBaseZoneId = getBaseId(sourceZoneId); // ⭐修正
                    
                    let actualTargetSlot = slot;
                    let targetZoneId = getParentZoneId(slot);
                    let targetBaseZoneId = getBaseId(targetZoneId); // ⭐修正

                    const imgElement = draggedItem.querySelector('.card-image');
                    let cardRotation = parseInt(imgElement.dataset.rotation) || 0;
                    
                    // ⭐修正: ベースIDでチェック
                    if (sourceBaseZoneId === 'mana' && cardRotation === 90) {
                        const currentValue = parseInt(manaCounterValueElement.value) || 0;
                        updateManaCounterValue(currentValue - 1);
                    }

                    let sourceArrangementId = null;
                    // ⭐修正: ベースIDでチェック
                    if (sourceBaseZoneId === 'deck-back-slots' || sourceBaseZoneId === 'grave-back-slots' || sourceBaseZoneId === 'exclude-back-slots' || sourceBaseZoneId === 'side-deck-back-slots' || sourceBaseZoneId === 'hand-zone') {
                        sourceArrangementId = sourceZoneId; // プレフィックス付きIDを保持
                    }
                    
                    let destinationArrangementId = null;

                    // ⭐修正: ベースIDでチェック
                    if (targetBaseZoneId === 'deck') destinationArrangementId = idPrefix + 'deck-back-slots';
                    else if (targetBaseZoneId === 'grave') destinationArrangementId = idPrefix + 'grave-back-slots';
                    else if (targetBaseZoneId === 'exclude') destinationArrangementId = idPrefix + 'exclude-back-slots';
                    else if (targetBaseZoneId === 'side-deck') destinationArrangementId = idPrefix + 'side-deck-back-slots';
                    else if (targetBaseZoneId === 'deck-back-slots' || targetBaseZoneId === 'grave-back-slots' || targetBaseZoneId === 'exclude-back-slots' || targetBaseZoneId === 'side-deck-back-slots') {
                        destinationArrangementId = targetZoneId; // プレフィックス付きID
                    } else if (targetBaseZoneId === 'hand-zone') {
                        destinationArrangementId = targetZoneId; // プレフィックス付きID
                    }
                    // ⭐新規追加: フリースペース ('free-space-slots') は destinationArrangementId = null のまま (通常ゾーン扱い)
                    else if (targetBaseZoneId === 'free-space-slots') {
                        destinationArrangementId = null; 
                    }


                    // ⭐修正: ベースIDでチェック
                    const isTargetMainZoneSlot = ['deck', 'grave', 'exclude', 'side-deck'].includes(targetBaseZoneId);

                        if (destinationArrangementId) {
                        // === 1. マルチスロット（手札/裏面）への移動 ===
                        
                        // ⭐修正: ベースIDでチェック & このインスタンスの isDecorationMode を参照
                        if (isDecorationMode && getBaseId(destinationArrangementId) !== 'hand-zone') {
                            console.log("装飾モード中は裏面スロットへのカード移動はできません。");
                            
                            // ⭐修正: ベースIDでチェック
                            if (sourceBaseZoneId === 'mana' && cardRotation === 90) {
                                const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                updateManaCounterValue(currentValue + 1);
                            }
                            return; 
                        }
                        
                        const destinationContainer = document.getElementById(destinationArrangementId);
                        // ⭐修正: ベースIDでチェック
                        const slotsContainer = (getBaseId(destinationArrangementId) === 'hand-zone') ? destinationContainer : destinationContainer.querySelector('.deck-back-slot-container') || destinationContainer;
                        
                        if (isTargetMainZoneSlot) {
                            const emptySlot = Array.from(slotsContainer.querySelectorAll('.card-slot')).find(s => !s.querySelector('.thumbnail'));
                            if (emptySlot) {
                                actualTargetSlot = emptySlot;
                                targetZoneId = getParentZoneId(actualTargetSlot); // プレフィックス付きIDに更新
                            } else {
                                console.log(`${destinationArrangementId} スロットが全て埋まっています。移動できません。`);
                                // ⭐修正: ベースIDでチェック
                                if (sourceBaseZoneId === 'mana' && cardRotation === 90) {
                                    const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                    updateManaCounterValue(currentValue + 1);
                                }
                                return;
                            }
                        } else {
                            // ⭐修正: マルチスロット内のスロットへのドロップ時、スタックしないように空きスロットを探す
                            const isTargetSlotEmpty = !actualTargetSlot.querySelector('.thumbnail');
                            if (!isTargetSlotEmpty) {
                                const emptySlot = Array.from(slotsContainer.querySelectorAll('.card-slot')).find(s => !s.querySelector('.thumbnail'));
                                if (emptySlot) {
                                    actualTargetSlot = emptySlot;
                                    targetZoneId = getParentZoneId(actualTargetSlot); 
                                } else {
                                    console.log(`${destinationArrangementId} スロットが全て埋まっています。移動できません。`);
                                    // ⭐修正: ベースIDでチェック
                                    if (sourceBaseZoneId === 'mana' && cardRotation === 90) {
                                        const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                        updateManaCounterValue(currentValue + 1);
                                    }
                                    return;
                                }
                            }
                        }

                        sourceSlot.removeChild(draggedItem);
                        resetSlotToDefault(sourceSlot);
                        actualTargetSlot.appendChild(draggedItem); // マルチスロットは常に末尾 (一番上) に追加
                        
                        // ⭐ 修正: D&Dでは反転状態をリセットしない (コメントアウト)
                        // resetCardFlipState(draggedItem);
                        
                        resetSlotToDefault(actualTargetSlot); 
                        
                        // ⭐ 修正: 移動元のスタック状態を更新
                        updateSlotStackState(sourceSlot);
                        
                        if (sourceArrangementId) {
                            arrangeSlots(sourceArrangementId);
                            // ⭐修正: ベースIDでチェック & ベースIDを渡す
                            if (getBaseId(sourceArrangementId) !== 'hand-zone') {
                                syncMainZoneImage(getBaseId(sourceArrangementId).replace('-back-slots', ''));
                            }
                        }
                        
                        if (destinationArrangementId) {
                            arrangeSlots(destinationArrangementId);
                            // ⭐修正: ベースIDでチェック & ベースIDを渡す
                            if (getBaseId(destinationArrangementId) !== 'hand-zone') {
                                syncMainZoneImage(getBaseId(destinationArrangementId).replace('-back-slots', ''));
                            }
                        }

                    } else {
                        // === 2. 通常ゾーン（バトル、マナ、スペル、特殊ゾーン、フリースペース）への移動 ===

                        // ⭐ 修正: スタック可能ゾーンかチェック (グローバル変数から)
                        // ⭐ 修正: フリースペースはスタック不可
                        const isTargetStackable = stackableZones.includes(targetBaseZoneId) && (targetBaseZoneId !== 'free-space-slots');
                        const existingThumbnail = getExistingThumbnail(actualTargetSlot);

                        // ⭐ 2a. スタック可能ゾーンへの移動 (v1/19 修正)
                        if (isTargetStackable) {
                            // 常にカードをスロットに追加する
                            sourceSlot.removeChild(draggedItem);
                            resetSlotToDefault(sourceSlot);
                            
                            // ⭐ 修正: D&Dでは反転状態をリセットしない (コメントアウト)
                            // resetCardFlipState(draggedItem);
                            
                            // ⭐ 修正(v1/19): 新しいカードが一番下になるよう、先頭に挿入
                            const firstCard = actualTargetSlot.querySelector('.thumbnail');
                            if (firstCard) {
                                actualTargetSlot.insertBefore(draggedItem, firstCard);
                            } else {
                                actualTargetSlot.appendChild(draggedItem); // スロットが空ならそのまま追加
                            }
                            
                            // マナゾーンへの移動かチェック
// [削除またはコメントアウト START]
                            // ⭐ 修正: マナゾーンへの移動かチェック
                            if (targetBaseZoneId === 'mana' && sourceBaseZoneId !== 'mana') {
                                // カウンター増加
                                const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                updateManaCounterValue(currentValue + 1);
                            }
// [削除またはコメントアウト END]
                            
                            // 移動元のスロットを更新
                            if (sourceArrangementId) {
                                arrangeSlots(sourceArrangementId);
                                if (getBaseId(sourceArrangementId) !== 'hand-zone') {
                                    syncMainZoneImage(getBaseId(sourceArrangementId).replace('-back-slots', ''));
                                }
                            } else {
                                // 移動元が通常ゾーンだった場合、その状態も更新
                                updateSlotStackState(sourceSlot);
                            }
                            
                            // 移動先のスタック状態を更新
                            updateSlotStackState(actualTargetSlot);
                        }

                        // ⭐ 2b. スタック不可ゾーンへの移動 (フリースペース含む)
                        else if (existingThumbnail && sourceSlot !== actualTargetSlot) {
                            // 入れ替え処理
                            sourceSlot.removeChild(draggedItem);
                            resetSlotToDefault(sourceSlot);
                            
                            // ⭐ 修正: 入れ替え対象のカードの回転状態をリセット
                            resetSlotToDefault(existingThumbnail.parentNode); 
                            sourceSlot.appendChild(existingThumbnail);
                            
                            // ⭐ 修正: D&Dでは反転状態をリセットしない (コメントアウト)
                            // resetCardFlipState(existingThumbnail); 
                            
                            // ⭐ 修正: マナゾーンへの移動かチェック
                            if (sourceBaseZoneId === 'mana' && existingThumbnail.querySelector('.card-image').dataset.rotation === '90') {
                                const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                updateManaCounterValue(currentValue + 1); // 元の場所にマナが戻るので+1
                            }
                            
// [削除またはコメントアウト START]
                            // ⭐ 修正: マナゾーンへの移動かチェック
                            if (targetBaseZoneId === 'mana' && sourceBaseZoneId !== 'mana') {
                                // カウンター増加
                                const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                updateManaCounterValue(currentValue + 1);
                            }
// [削除またはコメントアウト END]

                            resetSlotToDefault(actualTargetSlot);
                            actualTargetSlot.appendChild(draggedItem);
                            
                            // ⭐ 修正: D&Dでは反転状態をリセットしない (コメントアウト)
                            // resetCardFlipState(draggedItem);
                            
                        } else if (!existingThumbnail) {
                            // 移動処理
                            sourceSlot.removeChild(draggedItem);
                            resetSlotToDefault(sourceSlot);
                            actualTargetSlot.appendChild(draggedItem);
                            
                            // ⭐ 修正: D&Dでは反転状態をリセットしない (コメントアウト)
                            // resetCardFlipState(draggedItem);
                            
// [削除またはコメントアウト START]
                            // ⭐ 修正: マナゾーンへの移動かチェック
                            if (targetBaseZoneId === 'mana' && sourceBaseZoneId !== 'mana') {
                                // カウンター増加
                                const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                updateManaCounterValue(currentValue + 1);
                            }
// [削除またはコメントアウト END]

                            // ⭐修正: 回転不可ゾーン (フリースペース含む) への移動時は回転をリセット
                            if (nonRotatableZones.includes(targetBaseZoneId) || targetBaseZoneId === 'free-space-slots') {
                                 resetSlotToDefault(actualTargetSlot);
                            } else {
                                 // (マナゾーンの場合もリセット)
                                 resetSlotToDefault(actualTargetSlot);
                            }
                        } else {
                            // (sourceSlot === actualTargetSlot) or (stackable and thumbnail exists but logic failed)
                            return;
                        }
                        
                        // ⭐ 3. 移動元がアレンジスロットだった場合の共通処理 (スタック不可ゾーンの場合のみ)
                        if (sourceArrangementId && !isTargetStackable) {
                            arrangeSlots(sourceArrangementId);
                            if (getBaseId(sourceArrangementId) !== 'hand-zone') {
                                syncMainZoneImage(getBaseId(sourceArrangementId).replace('-back-slots', ''));
                            }
                        }
                    }
                    
                    // ⭐修正: ベースIDでチェック
                    if (decorationZones.includes(sourceBaseZoneId) && !sourceArrangementId) {
                         // syncMainZoneImage(sourceBaseZoneId); // L793: sourceBaseZoneIdはプレフィックス付きID (e.g., 'opponent-deck')
                         syncMainZoneImage(getBaseId(sourceBaseZoneId)); // ⭐これが正しい
                    }
                }
            });
            // ===== ⭐ここまで変更 =====
        }
        
        /**
         * ⭐ 修正: カードをドローする関数
         * (L1066)
         */
        function drawCard() {
            // 1. デッキ裏面スロット内のサムネイルを取得
            // ⭐修正: スタックを考慮せず、スロット内の最初のカードを取得
            const deckSlots = Array.from(deckBackSlots.querySelectorAll('.card-slot'));
            let cardToDraw = null;
            let sourceSlot = null;

            // デッキの一番上（最初のスロット）からカードを探す
            for (const slot of deckSlots) {
                const thumbnail = slot.querySelector('.thumbnail'); // 一番下のカード（DOMの最初）
                if (thumbnail) {
                    cardToDraw = thumbnail;
                    sourceSlot = slot;
                    break;
                }
            }
            
            if (!cardToDraw || !sourceSlot) {
                // alert('デッキにカードがありません。'); // alert は禁止
                console.warn('デッキにカードがありません。');
                return false;
            }

            // 2. 手札ゾーンの最初の空きスロットを探す
            const handSlots = Array.from(handZone.querySelectorAll('.card-slot'));
            const emptyHandSlot = handSlots.find(slot => !slot.querySelector('.thumbnail'));

            if (!emptyHandSlot) {
                // alert('手札スロットが全て埋まっています。'); // alert は禁止
                console.warn('手札スロットが全て埋まっています。');
                return false;
            }

            // 3. デッキの一番上（配列の最初の要素）のカードを移動
            sourceSlot.removeChild(cardToDraw);
            emptyHandSlot.appendChild(cardToDraw);
            
            // ⭐ 新規追加: ドロー時に反転状態をリセット
            resetCardFlipState(cardToDraw);
            
            resetSlotToDefault(sourceSlot);
            updateSlotStackState(sourceSlot); // ⭐追加
            resetSlotToDefault(emptyHandSlot);
            
            // 4. デッキの裏面スロットを整理
            arrangeSlots(deckBackSlotsId); // プレフィックス付きID
            // 5. デッキのメインスロット画像を同期
            syncMainZoneImage('deck'); // ベースID
            
            return true;
        }


        
        // -----------------------------------------------------
        // 5. イベントリスナーの設定 (メイン実行ブロック)
        // -----------------------------------------------------
        
        // (L15) 装飾モードボタン
        if (decorationModeBtn) {
            decorationModeBtn.addEventListener('click', () => {
                isDecorationMode = !isDecorationMode;
                
                // ⭐修正: プレイヤー側/相手側で固有のクラスをbodyに付与
                const decorationClass = (idPrefix === 'opponent-') ? 'opponent-decoration-mode-active' : 'player-decoration-mode-active';
                
                if (isDecorationMode) {
                    decorationModeBtn.textContent = 'キャンセル';
                    decorationModeBtn.style.backgroundColor = '#cc0000'; 
                    decorationModeBtn.style.boxShadow = '0 3px #800000';
                    document.body.classList.add(decorationClass); // ⭐修正
                    
                } else {
                    decorationModeBtn.textContent = '装飾モード';
                    decorationModeBtn.style.backgroundColor = '#ffcc00'; 
                    decorationModeBtn.style.boxShadow = '0 3px #997a00';
                    document.body.classList.remove(decorationClass); // ⭐修正
                }
            });
        }
        
        // ⭐新規追加: S/Mトグルボタンの処理
        if (smToggleBtn) {
            smToggleBtn.addEventListener('click', () => {
                const currentMode = smToggleBtn.dataset.mode;
                
                // ⭐修正: このインスタンスのラッパーに適用するクラス名を定義
                const sadistClass = (idPrefix === 'opponent-') ? 'opponent-sadist-mode' : 'player-sadist-mode';

                if (currentMode === 'sadist') {
                    smToggleBtn.dataset.mode = 'masochist';
                    smToggleBtn.textContent = 'マゾヒスト';
                    // ⭐修正: ラッパー要素からクラスを削除
                    wrapperElement.classList.remove(sadistClass);
                } else {
                    smToggleBtn.dataset.mode = 'sadist';
                    smToggleBtn.textContent = 'サディスト';
                    // ⭐修正: ラッパー要素にクラスを追加
                    wrapperElement.classList.add(sadistClass);
                }
            });
        }

        // (L183) 外部ファイル（画像）のドロップを処理するイベントリスナー
        // ⭐修正: このインスタンスのラッパー内の要素のみを対象にする
        const dropTargets = wrapperElement.querySelectorAll(
            // '.card-slot, ...' // ⭐変更 (ドラッグ無効化 4/6): L.920 (addSlotEventListeners) で設定するため、ここでは除外
            '#' + idPrefix + 'hand-zone, .sidebar-slot-area, .sidebar-bottom-half, #' + idPrefix + 'deck, #' + idPrefix + 'grave, #' + idPrefix + 'exclude, #' + idPrefix + 'side-deck'
        ); 
        
        dropTargets.forEach(target => {
            target.addEventListener('dragover', (e) => {
                e.preventDefault(); // ドロップを許可
                // ===== ⭐ここから変更 (ドラッグ無効化 5/6) =====
                e.stopPropagation(); // document のリスナーを止める
                // ファイルドロップの場合は 'copy' が一般的
                e.dataTransfer.dropEffect = 'copy'; 
                // ===== ⭐ここまで変更 =====
            });
        });

        // ⭐修正: document.body ではなく、このインスタンスのラッパーにドロップリスナーを設定
        wrapperElement.addEventListener('drop', (e) => {
            // (L599 で処理されるカードドロップの場合、e.dataTransfer.files.length は 0 のはず)
            if (e.dataTransfer.files.length === 0) {
                // ===== ⭐ここから追加 (ドラッグ無効化 6/6) =====
                // カードドロップがスロット外 (ラッパー上) で行われた場合
                e.preventDefault(); // 念のためデフォルト動作を防ぐ
                e.stopPropagation(); // document の drop を止める
                // ===== ⭐ここまで追加 =====
                return;
            }

            e.preventDefault();
            e.stopPropagation(); // ⭐追加 (ドラッグ無効化 6/6): document の drop を止める
            
            // ⭐修正: IDセレクタをクラスセレクタに変更 (フリースペース対応)
            let targetArea = e.target.closest('.zone, .hand-zone-slots, .sidebar-slot-area, .sidebar-bottom-half');

            let targetSlot = e.target.closest('.card-slot'); 
            
            if (targetArea || targetSlot) { // ファイルドロップの処理
                
                const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                if (files.length === 0) return;
                
                if (!targetArea && targetSlot) {
                    // targetArea = targetSlot.closest('.zone'); // ゾーンとは限らない
                    // ⭐修正: getParentZoneId を使って親を特定
                    const parentZoneId = getParentZoneId(targetSlot);
                    if (parentZoneId) {
                        targetArea = document.getElementById(parentZoneId);
                    }
                }
                
                // ⭐修正: ベースIDでチェック & このインスタンスの isDecorationMode を参照
                if (isDecorationMode && targetArea && decorationZones.includes(getBaseId(targetArea.id))) {
                    const mainSlot = targetSlot || targetArea.querySelector('.card-slot');
                    const file = files[0];
                    
                    if (mainSlot && file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const existingThumbnail = getExistingThumbnail(mainSlot);
                            if (existingThumbnail) {
                                mainSlot.removeChild(existingThumbnail);
                                cardPreviewArea.innerHTML = '<p>カードにカーソルを合わせてください</p>';
                                resetSlotToDefault(mainSlot);
                                updateSlotStackState(mainSlot); // ⭐ 追加
                            }
                            
                            // ⭐ 修正: createCardThumbnail の呼び出し方を変更 (v2)
                            createCardThumbnail(event.target.result, mainSlot, true); // 装飾カードは常に一番上
                            // ⭐修正: ベースIDを渡す
                            syncMainZoneImage(getBaseId(targetArea.id));
                        };
                        reader.readAsDataURL(file);
                    }
                    return; 
                }
                
                // 通常の処理
                let destinationId = null;
                if (targetArea) { 
                    const targetBaseId = getBaseId(targetArea.id); // ⭐修正
                    // ⭐修正: ベースIDでチェック & プレフィックス付きIDを構築
                    if (targetBaseId === 'deck') destinationId = idPrefix + 'deck-back-slots';
                    else if (targetBaseId === 'grave') destinationId = idPrefix + 'grave-back-slots';
                    else if (targetBaseId === 'exclude') destinationId = idPrefix + 'exclude-back-slots';
                    else if (targetBaseId === 'side-deck') destinationId = idPrefix + 'side-deck-back-slots';
                    else if (targetBaseId === 'deck-back-slots' || targetBaseId === 'grave-back-slots' || targetBaseId === 'exclude-back-slots' || targetBaseId === 'side-deck-back-slots') {
                        destinationId = targetArea.id; // 既にプレフィックス付き
                    } else if (targetBaseId === 'hand-zone') {
                        destinationId = targetArea.id; // 既にプレフィックス付き
                    }
                    // ⭐新規追加: フリースペースは destinationId = null (通常スロット扱い)
                    else if (targetBaseId === 'free-space-slots') {
                         destinationId = null; 
                    }
                }

                if (destinationId) {
                    // === 1. マルチスロット（手札/裏面）へのファイルドロップ ===
                    
                    // ⭐修正: ベースIDでチェック & このインスタンスの isDecorationMode を参照
                    if (isDecorationMode && getBaseId(destinationId) !== 'hand-zone') {
                        console.log("装飾モード中は裏面スロットへのファイル追加はできません。");
                        return;
                    }
                    
                    const destinationContainer = document.getElementById(destinationId);
                    // ⭐修正: ベースIDでチェック
                    const slotsContainer = (getBaseId(destinationId) === 'hand-zone') ? destinationContainer : destinationContainer.querySelector('.deck-back-slot-container') || destinationContainer;
                    const availableSlots = Array.from(slotsContainer.querySelectorAll('.card-slot')).filter(s => !s.querySelector('.thumbnail'));
                    
                    if (availableSlots.length === 0) {
                        // alert(`${destinationId} のスロットが全て埋まっています。`); // alert は禁止
                        console.warn(`${destinationId} のスロットが全て埋まっています。`);
                        return;
                    }
                    
                    let fileIndex = 0;
                    let slotIndex = 0;
                    
                    while (fileIndex < files.length && slotIndex < availableSlots.length) {
                        const file = files[fileIndex];
                        const slot = availableSlots[slotIndex];
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            // ⭐ 修正: createCardThumbnail の呼び出し方を変更 (v2)
                            createCardThumbnail(event.target.result, slot); // マルチスロットは常に一番上
                            // updateSlotStackState(slot); // arrangeSlots が行うので不要
                        };
                        reader.readAsDataURL(file);
                        
                        fileIndex++;
                        slotIndex++;
                    }
                    
                    setTimeout(() => {
                        arrangeSlots(destinationId);
                        // ⭐修正: ベースIDでチェック & ベースIDを渡す
                        if (getBaseId(destinationId) !== 'hand-zone') {
                            syncMainZoneImage(getBaseId(destinationId).replace('-back-slots', ''));
                        }
                    }, 100); 

                } else if (targetSlot) {
                    // === 2. 通常スロットへのファイルドロップ (フリースペース含む) ===
                    
                    const targetParentZoneId = getParentZoneId(targetSlot);
                    const targetParentBaseId = getBaseId(targetParentZoneId); // ⭐修正
                    
                    // ⭐修正: ベースIDでチェック & このインスタンスの isDecorationMode を参照
                    if (!isDecorationMode && decorationZones.includes(targetParentBaseId)) {
                        // === 2a. 通常モードで装飾ゾーン（デッキ等）にドロップ ===
                        
                        let destinationId = null;
                        // ⭐修正: ベースIDでチェック & プレフィックス付きIDを構築
                        if (targetParentBaseId === 'deck') destinationId = idPrefix + 'deck-back-slots';
                        else if (targetParentBaseId === 'grave') destinationId = idPrefix + 'grave-back-slots';
                        else if (targetParentBaseId === 'exclude') destinationId = idPrefix + 'exclude-back-slots';
                        else if (targetParentBaseId === 'side-deck') destinationId = idPrefix + 'side-deck-back-slots';
                        
                        if (destinationId) {
                            const destinationContainer = document.getElementById(destinationId);
                            const slotsContainer = destinationContainer.querySelector('.deck-back-slot-container') || destinationContainer;
                            const availableSlots = Array.from(slotsContainer.querySelectorAll('.card-slot')).filter(s => !s.querySelector('.thumbnail'));
                            
                            if (availableSlots.length === 0) {
                                // alert(`${destinationId} のスロットが全て埋まっています。`); // alert は禁止
                                console.warn(`${destinationId} のスロットが全て埋まっています。`);
                                return;
                            }
                            
                            let fileIndex = 0;
                            let slotIndex = 0;
                            
                            while (fileIndex < files.length && slotIndex < availableSlots.length) {
                                const file = files[fileIndex];
                                const slot = availableSlots[slotIndex];
                                
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    // ⭐ 修正: createCardThumbnail の呼び出し方を変更 (v2)
                                    createCardThumbnail(event.target.result, slot); // マルチスロットは常に一番上
                                };
                                reader.readAsDataURL(file);
                                
                                fileIndex++;
                                slotIndex++;
                            }
                            
                            setTimeout(() => {
                                arrangeSlots(destinationId);
                                // ⭐修正: ベースIDを渡す
                                syncMainZoneImage(getBaseId(destinationId).replace('-back-slots', ''));
                            }, 100); 
                        } 
                    } else {
                        // === 2b. 通常の単一スロットへのドロップ (バトル, マナ, フリースペース etc.) ===
                        const file = files[0];
                        
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const actualTargetSlot = targetSlot; 
                                const targetParentZoneId = getParentZoneId(actualTargetSlot);
                                const targetParentBaseId = getBaseId(targetParentZoneId);
                                
                                // ⭐ 修正: スタック可能ゾーンかチェック (グローバル変数から)
                                // ⭐ 修正: フリースペースはスタック不可
                                const isTargetStackable = stackableZones.includes(targetParentBaseId) && (targetParentBaseId !== 'free-space-slots');
                                const existingThumbnail = getExistingThumbnail(actualTargetSlot);
                                
                                // ⭐修正: スタック不可ゾーンの場合のみ、既存のサムネイルを削除
                                if (!isTargetStackable && existingThumbnail) {
                                    actualTargetSlot.removeChild(existingThumbnail);
                                    
                                    // ⭐ 新規追加: 削除時に反転状態をリセット (入れ替えではないので不要だが念のため)
                                    // resetCardFlipState(existingThumbnail); // 削除したので不要
                                    
                                    cardPreviewArea.innerHTML = '<p>カードにカーソルを合わせてください</p>';
                                    resetSlotToDefault(actualTargetSlot);
                                    // updateSlotStackState(actualTargetSlot); // 削除したので不要
                                }

                                // ⭐修正: ベースIDでチェック & このインスタンスの isDecorationMode を参照
                                const isDecoration = isDecorationMode && decorationZones.includes(targetParentBaseId);
                                
                                // ⭐ 修正(v1/19): スタック可能ゾーンの場合、insertAtBottom = true を渡す
                                // ⭐ 修正: createCardThumbnail の呼び出し方を変更 (v2)
                                createCardThumbnail(event.target.result, actualTargetSlot, isDecoration, isTargetStackable);
                                
                                // ⭐追加: スタック状態を更新 (装飾カードは除く)
                                if (isTargetStackable && !isDecoration) {
                                    updateSlotStackState(actualTargetSlot);
                                }

// [削除またはコメントアウト START]
                                // ⭐修正: ベースIDでチェック
                                if (targetParentBaseId === 'mana') {
                                    // カウンター増加
                                    const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                    updateManaCounterValue(currentValue + 1);
                                }
// [削除またはコメントアウト END]
                                
                                if (isDecoration) {
                                    // ⭐修正: ベースIDを渡す
                                    syncMainZoneImage(targetParentBaseId);
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                    }
                }
            }
        });

        // (L946) デッキ/墓地/除外/EXデッキのゾーンヘッダーのクリックイベント
        // (L946) デッキ/墓地/除外/EXデッキのゾーンヘッダーのクリックイベント
        // ⭐修正: このインスタンスのラッパー内の要素のみを対象にする
        wrapperElement.querySelectorAll('.zone-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const parentZone = header.closest('.zone');
                if (parentZone) {
                    let targetId = null;
                    const baseId = getBaseId(parentZone.id); // ⭐修正
                    
                    // ⭐修正: ベースIDでチェック & プレフィックス付きIDを構築
                    if (baseId === 'deck') targetId = idPrefix + 'deck-back-slots';
                    else if (baseId === 'grave') targetId = idPrefix + 'grave-back-slots';
                    else if (baseId === 'exclude') targetId = idPrefix + 'exclude-back-slots';
                    else if (baseId === 'side-deck') targetId = idPrefix + 'side-deck-back-slots';
                    
                    if (targetId) {
                        toggleSidebarContent(targetId);
                    }
                }
            });
        });

        // (L986) LP/マナカウンターの長押し処理
        // -----------------------------------------------------
        let repeatTimer = null;
        let initialTimer = null;
        const initialDelay = 300; 
        const repeatInterval = 200;  

        function performCount(counterType, value) { // ⭐修正: isLPButton -> counterType
            if (counterType === 'lp') { // ⭐修正
                updateLPCounterValue(value);
            } else if (counterType === 'mana') { // ⭐修正
                let currentValue = parseInt(manaCounterValueElement.value) || 0;
                updateManaCounterValue(currentValue + value);
            } else if (counterType === 'turn') { // ⭐新規追加
                let currentValue = parseInt(turnCounterValueElement.value) || 1;
                updateTurnCounterValue(currentValue + value);
            }
        }

        function stopAction() {
            clearTimeout(initialTimer);
            clearInterval(repeatTimer);
            initialTimer = null;
            repeatTimer = null;
        }

        function startRepeat(counterType, value) { // ⭐修正: isLPButton -> counterType
            repeatTimer = setInterval(() => {
                performCount(counterType, value); // ⭐修正
            }, repeatInterval);
        }

        // ⭐修正: このインスタンスのラッパー内の要素のみを対象にする
        wrapperElement.querySelectorAll(`#${idPrefix}lp-counter-group .counter-btn, #${idPrefix}mana-counter-group .counter-btn, #${idPrefix}turn-counter-group .counter-btn`).forEach(button => { // ⭐修正
            if (button.id.endsWith('auto-decrease-btn')) {
                return;
            }
            
            const value = parseInt(button.dataset.value);
            // ⭐修正: プレフィックス付きIDでチェック
            let counterType = null; // ⭐修正
            if (button.closest('#' + idPrefix + 'lp-counter-group')) { // ⭐修正
                counterType = 'lp';
            } else if (button.closest('#' + idPrefix + 'mana-counter-group')) {
                counterType = 'mana';
            } else if (button.closest('#' + idPrefix + 'turn-counter-group')) { // ⭐新規追加
                counterType = 'turn';
            }

            const startActionHandler = (e) => {
                if (e.button !== undefined && e.button !== 0) return; 
                if (initialTimer || repeatTimer) return;
                
                performCount(counterType, value); // ⭐修正
                initialTimer = setTimeout(() => startRepeat(counterType, value), initialDelay); // ⭐修正
            };

            // PCマウスイベント
            button.addEventListener('mousedown', startActionHandler);
            // ⭐ グローバルリスナーだが、stopActionは
            // このインスタンスの initialTimer/repeatTimer のみをクリアするので問題ない
            document.addEventListener('mouseup', stopAction); 
            button.addEventListener('mouseleave', stopAction);
            
            // モバイルタッチイベント
            button.addEventListener('touchstart', startActionHandler);
            document.addEventListener('touchend', stopAction);
            document.addEventListener('touchcancel', stopAction);
            
            button.addEventListener('dragstart', (e) => e.preventDefault());
        });
        // -----------------------------------------------------

        // (L1063) ドローボタンの処理
        const drawButton = document.getElementById(idPrefix + 'draw-card');
        if (drawButton) {
            drawButton.addEventListener('click', drawCard);
        }
        
        // ===== ⭐ここから新規追加 (シャッフルボタンの処理) =====
        
        const shuffleButton = document.getElementById(idPrefix + 'shuffle-deck');
        if (shuffleButton) {
            shuffleButton.addEventListener('click', () => {
                
                // (deckBackSlots は L.286 で取得済み)
                // (deckBackSlotsId は L.282 で取得済み)
                
                if (!deckBackSlots || !deckBackSlotsId) {
                    console.warn("シャッフル対象のデッキコンテナが見つかりません。");
                    return;
                }

                // --- リセットボタン (L.1158) から流用 ---
                
                // 1. デッキ内の全スロットを取得
                const allDeckSlots = Array.from(deckBackSlots.querySelectorAll('.card-slot'));
                let currentDeckThumbnails = [];
                
                // 2. 全てのスロットからカードを収集し、スロットを空にする
                allDeckSlots.forEach(slot => {
                    // スタックされているカードをすべて収集
                    const thumbnails = slot.querySelectorAll('.thumbnail');
                    thumbnails.forEach(thumbnail => {
                        slot.removeChild(thumbnail);
                        currentDeckThumbnails.push(thumbnail);
                    });
                    // スロットの状態もリセット (スタック解除など)
                    resetSlotToDefault(slot);
                    updateSlotStackState(slot);
                });

                // 3. カード配列をシャッフル
                shuffleArray(currentDeckThumbnails); 
                
                // 4. シャッフルしたカードをスロットに再配置
                for (let i = 0; i < currentDeckThumbnails.length; i++) {
                     if (allDeckSlots[i]) {
                        allDeckSlots[i].appendChild(currentDeckThumbnails[i]);
                        resetSlotToDefault(allDeckSlots[i]); 
                        // スタック状態を更新 (通常は1枚だが念のため)
                        updateSlotStackState(allDeckSlots[i]);
                    }
                }
                
                // 5. デッキの裏面スロットを整理 (arrangeSlots は不要、シャッフル後は詰まっているはず)
                // arrangeSlots(deckBackSlotsId); 
                
                // 6. メインスロット画像を同期
                syncMainZoneImage('deck'); // ベースID
            });
        }

        
        // (L1095) リセットボタンの処理
        const resetButton = document.getElementById(idPrefix + 'reset-and-draw');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                
                // ⭐修正: このインスタンスのラッパー内の要素のみを対象にする
                const allSlots = wrapperElement.querySelectorAll('.card-slot');
                let cardThumbnails = [];
                
                allSlots.forEach(slot => {
                    const parentZoneId = getParentZoneId(slot);
                    const baseParentZoneId = getBaseId(parentZoneId); // ⭐修正
                    
                    // ===== ⭐ここから修正 (フリースペースを除外) =====
                    if (baseParentZoneId === 'free-space-slots') {
                        return; // フリースペースのスロットはスキップ
                    }
                    // ===== ⭐ここまで修正 =====
                    
                    // ⭐修正: ベースIDでチェック
                    const isSideDeckZone = (baseParentZoneId === 'side-deck' || baseParentZoneId === 'side-deck-back-slots');

                    resetSlotToDefault(slot);
                    slot.classList.remove('stacked'); // ⭐ 追加: スタック状態を解除

                    if (isSideDeckZone) {
                        return; 
                    }

                    const thumbnail = slot.querySelector('.thumbnail');
                    if (thumbnail && thumbnail.dataset.isDecoration !== 'true') { 
                        slot.removeChild(thumbnail);
                        
                        // ⭐ 新規追加: リセット時に反転状態をリセット
                        resetCardFlipState(thumbnail);
                        
                        cardThumbnails.push(thumbnail);
                    }
                    
                    // ⭐ 追加: 複数のカードがスタックしていた場合、全て収集する
                    const remainingThumbnails = slot.querySelectorAll('.thumbnail:not([data-is-decoration="true"])');
                    remainingThumbnails.forEach(thumb => {
                        slot.removeChild(thumb);
                        
                        // ⭐ 新規追加: リセット時に反転状態をリセット
                        resetCardFlipState(thumb);
                        
                        cardThumbnails.push(thumb);
                    });
                });

                cardPreviewArea.innerHTML = '<p>カードにカーソルを合わせてください</p>';
                lpCounterValueElement.value = 20;
                updateManaCounterValue(0); 
                updateTurnCounterValue(1); // ⭐新規追加

                // ⭐修正: このインスタンスのタイマーをリセット
                if (lpDecreaseTimer) {
                    clearInterval(lpDecreaseTimer);
                    lpDecreaseTimer = null;
                    lpAutoDecreaseBtn.textContent = '自動減少';
                    lpAutoDecreaseBtn.style.backgroundColor = '#f0f0f0';
                    lpAutoDecreaseBtn.style.boxShadow = '0 2px #b0b0b0';
                }
                if (manaDecreaseTimer) {
                    clearInterval(manaDecreaseTimer);
                    manaDecreaseTimer = null;
                    manaAutoDecreaseBtn.textContent = '自動減少';
                    manaAutoDecreaseBtn.style.backgroundColor = '#f0f0f0';
                    manaAutoDecreaseBtn.style.boxShadow = '0 2px #b0b0b0';
                }


                // (deckBackSlots は L1359 で取得済み)
                const availableSlots = Array.from(deckBackSlots.querySelectorAll('.card-slot'));
                
                let slotIndex = 0;
                for (let i = 0; i < cardThumbnails.length; i++) {
                    if (availableSlots[slotIndex]) {
                        availableSlots[slotIndex].appendChild(cardThumbnails[i]);
                        resetSlotToDefault(availableSlots[slotIndex]); 
                        slotIndex++;
                    }
                }
                
                arrangeSlots(deckBackSlotsId); // プレフィックス付きID
                
                const allDeckSlots = Array.from(deckBackSlots.querySelectorAll('.card-slot'));
                let currentDeckThumbnails = [];
                
                allDeckSlots.forEach(slot => {
                    // ⭐修正: スタックされているカードをすべて収集
                    const thumbnails = slot.querySelectorAll('.thumbnail');
                    thumbnails.forEach(thumbnail => {
                        slot.removeChild(thumbnail);
                        currentDeckThumbnails.push(thumbnail);
                    });
                });
                
                shuffleArray(currentDeckThumbnails); 
                
                for (let i = 0; i < currentDeckThumbnails.length; i++) {
                     if (allDeckSlots[i]) {
                        allDeckSlots[i].appendChild(currentDeckThumbnails[i]);
                        resetSlotToDefault(allDeckSlots[i]); 
                    }
                }
                
                // ===== ⭐ここから修正 (5ドロー削除) =====
                /*
                for (let i = 0; i < 5; i++) {
                    if (!drawCard()) break; 
                }
                */
                // ===== ⭐ここまで修正 =====

                // ⭐修正: このインスタンスのラッパー内の要素のみを対象にする
                wrapperElement.querySelectorAll('.deck-zone .card-slot, .grave-zone .card-slot, .exclude-zone .card-slot').forEach(slot => { 
                    slot.dataset.hasCard = 'false';
                    const img = slot.querySelector('img.zone-image'); 
                    const count = slot.querySelector('.count-overlay');
                    if(img) img.style.display = 'none';
                    if(count) count.style.display = 'none';
                });

                syncMainZoneImage('deck');
                syncMainZoneImage('grave');
                syncMainZoneImage('exclude');
                syncMainZoneImage('side-deck'); // ベースID

                // ⭐修正: このインスタンスの装飾モードをオフにする
                isDecorationMode = false;
                if (decorationModeBtn) {
                    decorationModeBtn.textContent = '装飾モード';
                    decorationModeBtn.style.backgroundColor = '#ffcc00'; 
                    decorationModeBtn.style.boxShadow = '0 3px #997a00';
                }

                // ⭐修正: このインスタンスのS/Mモードをデフォルトにリセット
                if (smToggleBtn) {
                    const sadistClass = (idPrefix === 'opponent-') ? 'opponent-sadist-mode' : 'player-sadist-mode';
                    wrapperElement.classList.remove(sadistClass); // まずクラスを削除

                    if (idPrefix === 'opponent-') {
                        // 相手側は 'sadist' がデフォルト
                        smToggleBtn.dataset.mode = 'sadist';
                        smToggleBtn.textContent = 'サディスト';
                        wrapperElement.classList.add(sadistClass); // デフォルトで追加
                    } else {
                        // プレイヤー側は 'masochist' がデフォルト
                        smToggleBtn.dataset.mode = 'masochist';
                        smToggleBtn.textContent = 'マゾヒスト';
                    }
                }
                
                // ⭐修正: このインスタンスの装飾クラスをbodyから削除
                const decorationClass = (idPrefix === 'opponent-') ? 'opponent-decoration-mode-active' : 'player-decoration-mode-active';
                document.body.classList.remove(decorationClass);
                
                // ⭐修正: このインスタンスのサイドバーを開く
                toggleSidebarContent(deckBackSlotsId); // プレフィックス付きID
            });
        }

        // ⭐ 新規追加: 盤面反転ボタンの処理
        const flipBoardButton = document.getElementById(idPrefix + 'flip-board-btn');
        if (flipBoardButton) {
            flipBoardButton.addEventListener('click', () => {
                document.body.classList.toggle('board-flipped');
            });
        }

        // (L1273) 自動減少機能
        if (lpAutoDecreaseBtn) {
            lpAutoDecreaseBtn.addEventListener('click', () => {
                if (lpDecreaseTimer) {
                    clearInterval(lpDecreaseTimer);
                    lpDecreaseTimer = null;
                    lpAutoDecreaseBtn.textContent = '自動減少';
                    lpAutoDecreaseBtn.style.backgroundColor = '#f0f0f0'; 
                    lpAutoDecreaseBtn.style.boxShadow = '0 2px #b0b0b0';
                } else {
                    lpAutoDecreaseBtn.textContent = '停止';
                    lpAutoDecreaseBtn.style.backgroundColor = '#cc0000'; 
                    lpAutoDecreaseBtn.style.boxShadow = '0 2px #800000'; 
                    lpDecreaseTimer = setInterval(() => {
                        updateLPCounterValue(-1); 
                    }, 1000);
                }
            });
        }

        if (manaAutoDecreaseBtn) {
            manaAutoDecreaseBtn.addEventListener('click', () => {
                if (manaDecreaseTimer) {
                    clearInterval(manaDecreaseTimer);
                    manaDecreaseTimer = null;
                    manaAutoDecreaseBtn.textContent = '自動減少';
                    manaAutoDecreaseBtn.style.backgroundColor = '#f0f0f0';
                    manaAutoDecreaseBtn.style.boxShadow = '0 2px #b0b0b0';
                } else {
                    manaAutoDecreaseBtn.textContent = '停止';
                    manaAutoDecreaseBtn.style.backgroundColor = '#cc0000';
                    manaAutoDecreaseBtn.style.boxShadow = '0 2px #800000'; 
                    manaDecreaseTimer = setInterval(() => {
                        const currentValue = parseInt(manaCounterValueElement.value) || 0;
                        updateManaCounterValue(currentValue - 1);
                    }, 1000);
                }
            });
        }

        // ===== ⭐ここから新規追加 (ダイス/コイントス) =====
        
        const diceRollBtn = document.getElementById(idPrefix + 'dice-roll-btn');
        const coinTossBtn = document.getElementById(idPrefix + 'coin-toss-btn');
        const randomResultDisplay = document.getElementById(idPrefix + 'random-result');

        if (diceRollBtn && coinTossBtn && randomResultDisplay) {
            
            // 1. ダイスボタンの処理
            diceRollBtn.addEventListener('click', () => {
                // 1〜6のランダムな整数を生成
                const result = Math.floor(Math.random() * 6) + 1;
                randomResultDisplay.textContent = `ダイス: ${result}`;
            });

            // 2. コインボタンの処理
            coinTossBtn.addEventListener('click', () => {
                // 0 (ウラ) または 1 (オモテ) をランダムに生成
                const result = Math.random() < 0.5 ? 'ウラ' : 'オモテ';
                randomResultDisplay.textContent = `コイン: ${result}`;
            });
        }
        // ===== ⭐ここまで新規追加 =====

        // -----------------------------------------------------
        // 6. 初期化実行
        // -----------------------------------------------------
        
        // (L591) 全てのスロットにイベントリスナーを設定
        // ⭐修正: cardSlots (querySelectorAll('.card-slot')) にはフリースペースのスロットも含まれるはずだが、
        // 念のため、フリースペースのスロットにも個別でリスナーを設定する
        cardSlots.forEach(addSlotEventListeners);
        // freeSpaceSlots.forEach(addSlotEventListeners); // cardSlots に含まれるため不要


        // ⭐新規追加: デッキとEXデッキにデフォルトの装飾画像を設定
        const deckSlot = document.getElementById(idPrefix + 'deck')?.querySelector('.card-slot');
        const sideDeckSlot = document.getElementById(idPrefix + 'side-deck')?.querySelector('.card-slot');

        if (deckSlot) {
            // 'createCardThumbnail' は 'initializeBoard' のスコープ内で定義されている
            // ⭐ 修正: createCardThumbnail の呼び出し方を変更 (v2)
            createCardThumbnail('./decoration/デッキ.png', deckSlot, true); 
        }
        if (sideDeckSlot) {
            // ⭐ 修正: createCardThumbnail の呼び出し方を変更 (v2)
            createCardThumbnail('./decoration/EXデッキ.png', sideDeckSlot, true);
        }
        // === ⭐ここまで追加 ===

        // (L1267) メインゾーンの画像と枚数を初期化
        // (↑で追加した装飾カードがここで読み込まれ、同期されます)
        syncMainZoneImage('deck');
        syncMainZoneImage('grave');
        syncMainZoneImage('exclude');
        syncMainZoneImage('side-deck');

        
        // =====================================================
        // ⭐ 新規追加: インポート/エクスポート機能
        // =====================================================

        const exportButton = document.getElementById(idPrefix + 'export-deck-btn');
        const importButton = document.getElementById(idPrefix + 'import-deck-btn');

        /**
         * (ヘルパー関数) 指定されたコンテナ内のスロットからカードデータを抽出する
         * @param {string} containerId - 'opponent-deck-back-slots' など
         * @returns {Array|null} スロットごとのカード配列 (スタック対応)
         */
        function extractCardDataFromContainer(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return null;
            
            const baseId = getBaseId(containerId);
            let slotsContainer;
            if (baseId === 'free-space-slots') {
                slotsContainer = container.querySelector('.free-space-slot-container');
            } else if (baseId === 'deck' || baseId === 'side-deck' || baseId === 'grave' || baseId === 'exclude') {
                // メインゾーン (装飾用)
                slotsContainer = container.querySelector('.slot-container');
            } else {
                // 裏面スロット
                slotsContainer = container.querySelector('.deck-back-slot-container');
            }
            
            if (!slotsContainer) return null;

            const slots = slotsContainer.querySelectorAll('.card-slot');
            const zoneData = Array.from(slots).map(slot => {
                const thumbnails = slot.querySelectorAll('.thumbnail');
                if (thumbnails.length === 0) {
                    return null; // 空スロット
                }
                
                // スロット内のカードデータを配列として抽出 (スタック対応)
                // DOMの順序 = 下から上 へ
                const cardsInSlot = Array.from(thumbnails).map(thumb => {
                    const img = thumb.querySelector('.card-image');
                    const isFlipped = thumb.dataset.isFlipped === 'true';
                    const originalSrc = thumb.dataset.originalSrc || null;
                    let src;

                    if (isFlipped) {
                        src = img.src; // 裏側画像のSRC
                    } else {
                        src = img.src; // 表側画像のSRC
                    }

                    // ===== ⭐ここから変更 (メモ機能) =====
                    const counterOverlay = thumb.querySelector('.card-counter-overlay');
                    const counter = counterOverlay ? (parseInt(counterOverlay.dataset.counter) || 0) : 0;
                    const memo = thumb.dataset.memo || ''; // メモデータを取得

                    return {
                        src: src,
                        isDecoration: thumb.dataset.isDecoration === 'true',
                        isFlipped: isFlipped,
                        originalSrc: originalSrc, // 表側画像のSRC (反転時のみ)
                        counter: counter,
                        memo: memo // メモデータを追加
                    };
                    // ===== ⭐ここまで変更 =====
                });
                
                return cardsInSlot;
            });
            
            return zoneData;
        }

        /**
         * (ヘルパー関数) 指定されたコンテナ内のスロットデータをクリアする
         * @param {string} containerId - 'opponent-deck-back-slots' など
         * @param {boolean} clearDecorations - 装飾カードも削除するか
         */
        function clearContainerData(containerId, clearDecorations = false) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const baseId = getBaseId(containerId);
            let slotsContainer;
            if (baseId === 'free-space-slots') {
                slotsContainer = container.querySelector('.free-space-slot-container');
            } else if (baseId === 'deck' || baseId === 'side-deck' || baseId === 'grave' || baseId === 'exclude') {
                slotsContainer = container.querySelector('.slot-container');
            } else {
                slotsContainer = container.querySelector('.deck-back-slot-container');
            }

            if (!slotsContainer) return;

            slotsContainer.querySelectorAll('.card-slot').forEach(slot => {
                const thumbnails = slot.querySelectorAll('.thumbnail');
                thumbnails.forEach(thumb => {
                    if (clearDecorations || thumb.dataset.isDecoration !== 'true') {
                        slot.removeChild(thumb);
                    }
                });
                resetSlotToDefault(slot);
                updateSlotStackState(slot);
            });
        }

        /**
         * (ヘルパー関数) 指定されたコンテナのスロットにカードデータを配置する
         * @param {string} containerId - 'opponent-deck-back-slots' など
         * @param {Array} zoneData - スロットごとのカード配列
         */
        function applyCardDataToContainer(containerId, zoneData) {
            const container = document.getElementById(containerId);
            if (!container || !zoneData) return;

            const baseId = getBaseId(containerId);
            let slotsContainer;
            if (baseId === 'free-space-slots') {
                slotsContainer = container.querySelector('.free-space-slot-container');
            } else if (baseId === 'deck' || baseId === 'side-deck' || baseId === 'grave' || baseId === 'exclude') {
                slotsContainer = container.querySelector('.slot-container');
            } else {
                slotsContainer = container.querySelector('.deck-back-slot-container');
            }
            
            if (!slotsContainer) return;

            const slots = slotsContainer.querySelectorAll('.card-slot');
            
            zoneData.forEach((cardsInSlot, index) => {
                const slot = slots[index];
                if (!slot) return; // JSONデータのスロット数がHTMLより多い場合

                if (cardsInSlot && Array.isArray(cardsInSlot)) {
                    // スロットにカードがある場合 (スタック対応)
                    // データを下から上 (DOMの先頭から末尾) へ配置
                    cardsInSlot.forEach(cardData => {
                        // createCardThumbnail は末尾 (一番上) に追加する
                        // スタック順 (DOM順) を保持するため、insertAtBottom = false で良い
                        // ⭐修正: cardData には counter, memo の値も含まれている
                        createCardThumbnail(cardData, slot, false);
                    });
                }
                // null の場合はスロットを空のままにする (クリア処理で実施済み)
            });
        }


        // 1. エクスポートボタン
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                try {
                    const exportData = {
                        deck: extractCardDataFromContainer(idPrefix + 'deck-back-slots'),
                        sideDeck: extractCardDataFromContainer(idPrefix + 'side-deck-back-slots'),
                        freeSpace: extractCardDataFromContainer(idPrefix + 'free-space-slots'),
                        decorations: {
                            deck: extractCardDataFromContainer(idPrefix + 'deck'),
                            sideDeck: extractCardDataFromContainer(idPrefix + 'side-deck'),
                            grave: extractCardDataFromContainer(idPrefix + 'grave'),
                            exclude: extractCardDataFromContainer(idPrefix + 'exclude')
                        }
                    };

                    // 装飾データはスロットが1つしかないので、[0] の中身だけを保存する (null または カード配列)
                    if (exportData.decorations.deck) exportData.decorations.deck = exportData.decorations.deck[0] || null;
                    if (exportData.decorations.sideDeck) exportData.decorations.sideDeck = exportData.decorations.sideDeck[0] || null;
                    if (exportData.decorations.grave) exportData.decorations.grave = exportData.decorations.grave[0] || null;
                    if (exportData.decorations.exclude) exportData.decorations.exclude = exportData.decorations.exclude[0] || null;

                    // 装飾データのうち、装飾 (isDecoration=true) でないもの (メインスロットに入った通常カード) は除外する
                    Object.keys(exportData.decorations).forEach(key => {
                        const decorationSlotData = exportData.decorations[key]; // これはカード配列 [card1, card2] または null
                        if (decorationSlotData && Array.isArray(decorationSlotData)) {
                            // 装飾カードのみをフィルタリング
                            const filteredData = decorationSlotData.filter(card => card.isDecoration === true);
                            if (filteredData.length > 0) {
                                // スタックは想定しないが、配列として保持
                                exportData.decorations[key] = filteredData;
                            } else {
                                exportData.decorations[key] = null;
                            }
                        } else {
                            exportData.decorations[key] = null;
                        }
                    });


                    const jsonData = JSON.stringify(exportData, null, 2);
                    const blob = new Blob([jsonData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${idPrefix || 'player'}_deck_export.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                } catch (error) {
                    console.error("エクスポートに失敗しました:", error);
                    // alert("デッキのエクスポートに失敗しました。"); // alert は禁止
                    console.warn("デッキのエクスポートに失敗しました。");
                }
            });
        }

        // 2. インポートボタン
        if (importButton) {
            importButton.addEventListener('click', () => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.json, application/json';
                
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const importData = JSON.parse(event.target.result);
                            
                            if (!importData || (importData.deck === undefined && importData.sideDeck === undefined && importData.freeSpace === undefined)) {
                                throw new Error("無効なJSONデータ形式です。");
                            }

                            // --- 1. 既存データのクリア ---
                            // (装飾は残す)
                            clearContainerData(idPrefix + 'deck-back-slots', false);
                            clearContainerData(idPrefix + 'side-deck-back-slots', false);
                            clearContainerData(idPrefix + 'free-space-slots', false);
                            // (装飾ゾーンの通常カードもクリア)
                            clearContainerData(idPrefix + 'deck', false);
                            clearContainerData(idPrefix + 'side-deck', false);
                            clearContainerData(idPrefix + 'grave', false);
                            clearContainerData(idPrefix + 'exclude', false);
                            
                            // --- 2. 装飾データのクリア (インポートデータに装飾が含まれる場合) ---
                            if (importData.decorations) {
                                if (importData.decorations.deck !== undefined) clearContainerData(idPrefix + 'deck', true);
                                if (importData.decorations.sideDeck !== undefined) clearContainerData(idPrefix + 'side-deck', true);
                                if (importData.decorations.grave !== undefined) clearContainerData(idPrefix + 'grave', true);
                                if (importData.decorations.exclude !== undefined) clearContainerData(idPrefix + 'exclude', true);
                            }

                            // --- 3. データの適用 ---
                            applyCardDataToContainer(idPrefix + 'deck-back-slots', importData.deck);
                            applyCardDataToContainer(idPrefix + 'side-deck-back-slots', importData.sideDeck);
                            applyCardDataToContainer(idPrefix + 'free-space-slots', importData.freeSpace);
                            
                            // 装飾データの適用 (スロット[0] に適用する)
                            if (importData.decorations) {
                                // 装飾データは配列 [cardData] または null になっている想定
                                if (importData.decorations.deck) applyCardDataToContainer(idPrefix + 'deck', [importData.decorations.deck]);
                                if (importData.decorations.sideDeck) applyCardDataToContainer(idPrefix + 'side-deck', [importData.decorations.sideDeck]);
                                if (importData.decorations.grave) applyCardDataToContainer(idPrefix + 'grave', [importData.decorations.grave]);
                                if (importData.decorations.exclude) applyCardDataToContainer(idPrefix + 'exclude', [importData.decorations.exclude]);
                            }

                            // --- 4. UIの同期 ---
                            arrangeSlots(idPrefix + 'deck-back-slots');
                            arrangeSlots(idPrefix + 'side-deck-back-slots');
                            // (フリースペースは arrange 不要)

                            syncMainZoneImage('deck');
                            syncMainZoneImage('grave');
                            syncMainZoneImage('exclude');
                            syncMainZoneImage('side-deck');

                        } catch (error) {
                            console.error("インポートに失敗しました:", error);
                            // alert("デッキのインポートに失敗しました。無効なファイル形式の可能性があります。"); // alert は禁止
                            console.warn("デッキのインポートに失敗しました。無効なファイル形式の可能性があります。");
                        }
                    };
                    reader.readAsText(file);
                });
                
                fileInput.click();
            });
        }
        
        // (L1317) サイトロード時（初期状態）にデッキ内を開く
        toggleSidebarContent(deckBackSlotsId); // プレフィックス付きID
        
        // ⭐新規追加: S/Mモードの初期状態をラッパーに適用
        if (smToggleBtn) {
            const sadistClass = (idPrefix === 'opponent-') ? 'opponent-sadist-mode' : 'player-sadist-mode';
            if (smToggleBtn.dataset.mode === 'sadist') {
                wrapperElement.classList.add(sadistClass);
            } else {
                wrapperElement.classList.remove(sadistClass);
            }
        }
        
    } // --- End of initializeBoard ---


    // =====================================================
    // 7. ボード初期化の呼び出し
    // =====================================================
    
    // プレイヤー側のボードを初期化
    initializeBoard('.player-wrapper', '');
    
    // 相手側のボードを初期化
    initializeBoard('.opponent-wrapper', 'opponent-');

});
