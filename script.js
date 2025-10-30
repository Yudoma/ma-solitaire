document.addEventListener('DOMContentLoaded', () => {
    
    // =====================================================
    // 1. グローバル変数・定数
    // =====================================================
    
    // ⭐ グローバル: ボード間で共有されるドラッグ中のアイテム
    let draggedItem = null; 
    
    // ⭐ グローバル: 回転を許可しないゾーンの「ベースID」リスト
    const nonRotatableZones = ['deck', 'grave', 'exclude', 'hand-zone', 'deck-back-slots', 'side-deck', 'grave-back-slots', 'exclude-back-slots', 'side-deck-back-slots']; 
    
    // ⭐ グローバル: 装飾モードの対象となるゾーンの「ベースID」リスト
    const decorationZones = ['exclude', 'side-deck', 'grave', 'deck'];

    // ⭐ 新規追加: カスタムコンテキストメニュー
    const contextMenu = document.getElementById('custom-context-menu');
    const deleteMenuItem = document.getElementById('context-menu-delete');
    let currentDeleteHandler = null; // 削除処理を一時的に保持

    if (!contextMenu || !deleteMenuItem) {
        console.error("カスタムコンテキストメニューの要素が見つかりません。");
        return; 
    }

    // メニュー外クリックでメニューを閉じる
    document.addEventListener('click', (e) => {
        // メニュー自身がクリックされた場合は閉じない (削除ボタンの処理に任せる)
        if (e.target.closest('#custom-context-menu')) return;
        
        contextMenu.style.display = 'none';
        currentDeleteHandler = null;
    });
    
    // メニューのデフォルトのコンテキストメニューを無効化
    contextMenu.addEventListener('contextmenu', (e) => e.preventDefault());

    // 削除ボタンのクリック処理
    deleteMenuItem.addEventListener('click', () => {
        if (typeof currentDeleteHandler === 'function') {
            currentDeleteHandler(); // 保持していた削除処理を実行
        }
        contextMenu.style.display = 'none';
        currentDeleteHandler = null;
    });

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
        const existingThumbnail = slotElement.querySelector('.thumbnail');
        if (existingThumbnail) {
            return existingThumbnail;
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

        // 2. ⭐修正: 手札ゾーンをクラス名でチェック
        const handZone = slotElement.closest('.hand-zone-slots');
        if (handZone) {
            return handZone.id; // (e.g., 'hand-zone' or 'opponent-hand-zone')
        }

        // 3. メインボード上のゾーン (battle, mana, deck, grave, etc.) をチェック
        const parentZone = slotElement.closest('.zone');
        if (parentZone) {
            return parentZone.id; // (e.g., 'battle' or 'opponent-battle')
        }

        // 4. どのゾーンにも属さない場合 (フォールバック)
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
            if (container.parentNode.id) {
                parentZoneId = container.parentNode.id; 
            }
        } 
        else if (slotElement.parentNode.parentNode.classList.contains('hand-controls-top-wrapper')) {
            parentZoneId = slotElement.parentNode.id; 
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
        
        // ⭐新規追加: S/Mトグルボタン
        const smToggleBtn = document.getElementById(idPrefix + 'sm-toggle-btn');
        
        const handZoneId = idPrefix + 'hand-zone'; 
        const deckBackSlotsId = idPrefix + 'deck-back-slots'; 
        const handZone = document.getElementById(handZoneId);
        const deckBackSlotsContainer = document.getElementById(deckBackSlotsId);
        
        // 存在チェック
        if (!cardPreviewArea || !lpCounterValueElement || !manaCounterValueElement || !handZone || !deckBackSlotsContainer) {
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
         * ⭐ 修正: 指定されたコンテナ内のカードを左に詰める関数 (手札/裏面スロット用)
         * (L142)
         */
        function arrangeSlots(containerId) {
            const container = document.getElementById(containerId); // containerId は 'opponent-deck-back-slots' のようにプレフィックス付きで渡される
            if (!container) return;
            
            // ⭐修正: containerId のベースIDをチェック
            const baseId = getBaseId(containerId);
            const slotsContainer = (baseId === 'hand-zone') ? container : container.querySelector('.deck-back-slot-container') || container;
            
            const slots = Array.from(slotsContainer.querySelectorAll('.card-slot'));
            let cardThumbnails = [];

            // 1. 全てのスロットからカードを収集し、スロットを空にする
            slots.forEach(slot => {
                const thumbnail = slot.querySelector('.thumbnail');
                if (thumbnail) {
                    slot.removeChild(thumbnail);
                    cardThumbnails.push(thumbnail);
                    resetSlotToDefault(slot); 
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
                }
            }
        }
        
        /**
         * ⭐ 修正: カードサムネイル生成およびイベント設定関数
         * (L353)
         * この関数は `isDecorationMode` や `arrangeSlots` など、
         * `initializeBoard` スコープ内の変数・関数に依存するため、内部に定義する。
         */
        function createCardThumbnail(imageSrc, slotElement, isDecoration = false) {
            const thumbnailElement = document.createElement('div');
            thumbnailElement.classList.add('thumbnail');
            thumbnailElement.setAttribute('draggable', true); 
            
            if (isDecoration) {
                thumbnailElement.dataset.isDecoration = 'true';
            }

            const imgElement = document.createElement('img');
            imgElement.src = imageSrc;
            imgElement.classList.add('card-image');
            imgElement.dataset.rotation = 0; 
            
            thumbnailElement.appendChild(imgElement);
            slotElement.appendChild(thumbnailElement);
            
            const parentZoneId = getParentZoneId(slotElement);
            const baseParentZoneId = getBaseId(parentZoneId); // ⭐修正
            
            // ⭐修正: ベースIDでチェック
            if (baseParentZoneId === 'deck-back-slots' || baseParentZoneId === 'grave-back-slots' || baseParentZoneId === 'exclude-back-slots' || baseParentZoneId === 'side-deck-back-slots') {
                // ⭐修正: ベースIDを渡す
                syncMainZoneImage(baseParentZoneId.replace('-back-slots', ''));
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

                if (draggedItem) return; // グローバル変数をチェック
                
                if (thumbnailElement.dataset.isDecoration === 'true') {
                     e.stopPropagation(); 
                    return;
                }
                
                const imgElement = thumbnailElement.querySelector('.card-image');
                if (!imgElement) return;

                const slotElement = thumbnailElement.parentNode; 
                let parentZoneId = getParentZoneId(slotElement);
                let baseParentZoneId = getBaseId(parentZoneId); // ⭐修正

                // ⭐修正: ベースIDでチェック
                if (nonRotatableZones.includes(baseParentZoneId)) {
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
                };

                // 装飾モードのチェック (メニュー表示の可否)
                // (isDecorationMode は initializeBoard のスコープから取得)
                if (thumbnailElement.dataset.isDecoration === 'true' && !isDecorationMode) {
                    // 装飾カードだが装飾モードでない場合は、メニューも表示しない
                    return;
                }

                // 削除ハンドラをグローバルにセット
                currentDeleteHandler = performDelete;

                // コンテキストメニューを表示
                // (contextMenu は DOMContentLoaded のスコープから取得)
                contextMenu.style.top = `${e.pageY}px`;
                contextMenu.style.left = `${e.pageX}px`;
                contextMenu.style.display = 'block';
            });
            
            // ----------------------------------------------------
            // 7. ⭐追加: ホバーで全体画像を表示する機能
            // ----------------------------------------------------
            thumbnailElement.addEventListener('mouseover', (e) => {
                const imgElement = thumbnailElement.querySelector('.card-image');
                if (!imgElement) return;

                cardPreviewArea.innerHTML = ''; 
                const previewImg = document.createElement('img');
                previewImg.src = imgElement.src;
                cardPreviewArea.appendChild(previewImg);
                
                e.stopPropagation(); 
            });
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
            
            // ⭐修正: このインスタンスのサイドバーエリアのみを対象にする
            wrapperElement.querySelectorAll('.sidebar-slot-area').forEach(area => {
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
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');

                // ファイルドロップはラッパーのリスナーで処理 (L183)
                if (e.dataTransfer.files.length > 0) return; 

                if (draggedItem) { // ⭐ グローバル変数をチェック
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

                    // ⭐修正: ベースIDでチェック
                    const isTargetMainZoneSlot = ['deck', 'grave', 'exclude', 'side-deck'].includes(targetBaseZoneId);

                    if (destinationArrangementId) {
                        // マルチスロット（手札/裏面）への移動
                        
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
                        actualTargetSlot.appendChild(draggedItem);
                        resetSlotToDefault(actualTargetSlot); 
                        
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
                        // 通常ゾーン（バトル、マナ、スペル、特殊ゾーン）への移動

                        // ⭐修正: ベースIDでチェック
                        let isMoveToMana = (targetBaseZoneId === 'mana');
                        const existingThumbnail = getExistingThumbnail(actualTargetSlot);

                        if (existingThumbnail && sourceSlot !== actualTargetSlot) {
                            // 入れ替え処理
                            sourceSlot.removeChild(draggedItem);
                            resetSlotToDefault(sourceSlot);
                            sourceSlot.appendChild(existingThumbnail);
                            resetSlotToDefault(existingThumbnail.parentNode); 
                            
                            // ⭐修正: ベースIDでチェック
                            if (sourceBaseZoneId === 'mana' && existingThumbnail.querySelector('.card-image').dataset.rotation === '90') {
                                const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                updateManaCounterValue(currentValue + 1);
                            }
                            
                            // ⭐修正: ベースIDでチェック
                            if (isMoveToMana && sourceBaseZoneId !== 'mana') {
                                const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                updateManaCounterValue(currentValue + 1);
                            }

                            resetSlotToDefault(actualTargetSlot);
                            actualTargetSlot.appendChild(draggedItem);
                            
                        } else if (!existingThumbnail) {
                            // 移動処理
                            sourceSlot.removeChild(draggedItem);
                            resetSlotToDefault(sourceSlot);
                            actualTargetSlot.appendChild(draggedItem);
                            
                            // ⭐修正: ベースIDでチェック
                            if (isMoveToMana && sourceBaseZoneId !== 'mana') {
                                const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                updateManaCounterValue(currentValue + 1);
                            }

                            // ⭐修正: ベースIDでチェック
                            if (nonRotatableZones.includes(targetBaseZoneId)) {
                                 resetSlotToDefault(actualTargetSlot);
                            } else {
                                 resetSlotToDefault(actualTargetSlot);
                            }
                        } else {
                            return;
                        }
                        
                        if (sourceArrangementId) {
                            arrangeSlots(sourceArrangementId);
                            // ⭐修正: ベースIDでチェック & ベースIDを渡す
                            if (getBaseId(sourceArrangementId) !== 'hand-zone') {
                                syncMainZoneImage(getBaseId(sourceArrangementId).replace('-back-slots', ''));
                            }
                        }
                    }
                    
                    // ⭐修正: ベースIDでチェック
                    if (decorationZones.includes(sourceBaseZoneId) && !sourceArrangementId) {
                         syncMainZoneImage(sourceBaseZoneId); // プレフィックス付きだが...
                         // ⭐TODO: ここはベースIDを渡すべき
                         syncMainZoneImage(sourceBaseZoneId); // L793: sourceBaseZoneIdはプレフィックス付きID (e.g., 'opponent-deck')
                         syncMainZoneImage(getBaseId(sourceBaseZoneId)); // ⭐これが正しい
                    }
                }
            });
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
         * ⭐ 修正: カードをドローする関数
         * (L1066)
         */
        function drawCard() {
            // 1. デッキ裏面スロット内のサムネイルを取得
            const deckCards = Array.from(deckBackSlots.querySelectorAll('.thumbnail'));
            
            if (deckCards.length === 0) {
                alert('デッキにカードがありません。');
                return false;
            }

            // 2. 手札ゾーンの最初の空きスロットを探す
            const handSlots = Array.from(handZone.querySelectorAll('.card-slot'));
            const emptyHandSlot = handSlots.find(slot => !slot.querySelector('.thumbnail'));

            if (!emptyHandSlot) {
                alert('手札スロットが全て埋まっています。');
                return false;
            }

            // 3. デッキの一番上（配列の最初の要素）のカードを移動
            const cardToDraw = deckCards[0];
            const sourceSlot = cardToDraw.parentNode;

            sourceSlot.removeChild(cardToDraw);
            emptyHandSlot.appendChild(cardToDraw);
            resetSlotToDefault(sourceSlot);
            resetSlotToDefault(emptyHandSlot);
            
            // 4. デッキの裏面スロットを整理
            arrangeSlots(deckBackSlotsId); // プレフィックス付きID
            // 5. デッキのメインスロット画像を同期
            syncMainZoneImage('deck'); // ベースID
            
            return true;
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
            
            const backSlots = backSlotsContainer ? backSlotsContainer.querySelector('.deck-back-slot-container') : null;
            const occupiedSlots = backSlots ? Array.from(backSlots.querySelectorAll('.card-slot:has(.thumbnail)')) : [];
            const cardCount = occupiedSlots.length;
            
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
                    targetCardThumbnail = occupiedSlots[0].querySelector('.thumbnail');
                } else if (baseZoneId === 'grave' || baseZoneId === 'exclude') {
                    targetCardThumbnail = occupiedSlots[occupiedSlots.length - 1].querySelector('.thumbnail');
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
                     mainSlotImg.src = cardImg.src;
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
            '.card-slot, #' + idPrefix + 'hand-zone, .sidebar-slot-area, #' + idPrefix + 'deck, #' + idPrefix + 'grave, #' + idPrefix + 'exclude, #' + idPrefix + 'side-deck'
        ); 
        
        dropTargets.forEach(target => {
            target.addEventListener('dragover', (e) => {
                e.preventDefault(); // ドロップを許可
            });
        });

        // ⭐修正: document.body ではなく、このインスタンスのラッパーにドロップリスナーを設定
        wrapperElement.addEventListener('drop', (e) => {
            // (L599 で処理されるカードドロップの場合、e.dataTransfer.files.length は 0 のはず)
            if (e.dataTransfer.files.length === 0) return;

            e.preventDefault();
            
            // ⭐修正: IDセレクタをクラスセレクタに変更
            let targetArea = e.target.closest('.zone, .hand-zone-slots, .sidebar-slot-area'); 
            let targetSlot = e.target.closest('.card-slot'); 
            
            if (targetArea || targetSlot) { // ファイルドロップの処理
                
                const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                if (files.length === 0) return;
                
                if (!targetArea && targetSlot) {
                    targetArea = targetSlot.closest('.zone');
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
                            }
                            
                            createCardThumbnail(event.target.result, mainSlot, true);
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
                }

                if (destinationId) {
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
                        alert(`${destinationId} のスロットが全て埋まっています。`);
                        return;
                    }
                    
                    let fileIndex = 0;
                    let slotIndex = 0;
                    
                    while (fileIndex < files.length && slotIndex < availableSlots.length) {
                        const file = files[fileIndex];
                        const slot = availableSlots[slotIndex];
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            createCardThumbnail(event.target.result, slot); 
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
                    const targetParentZoneId = getParentZoneId(targetSlot);
                    const targetParentBaseId = getBaseId(targetParentZoneId); // ⭐修正
                    
                    // ⭐修正: ベースIDでチェック & このインスタンスの isDecorationMode を参照
                    if (!isDecorationMode && decorationZones.includes(targetParentBaseId)) {
                        
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
                                alert(`${destinationId} のスロットが全て埋まっています。`);
                                return;
                            }
                            
                            let fileIndex = 0;
                            let slotIndex = 0;
                            
                            while (fileIndex < files.length && slotIndex < availableSlots.length) {
                                const file = files[fileIndex];
                                const slot = availableSlots[slotIndex];
                                
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    createCardThumbnail(event.target.result, slot); 
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
                        // 通常の単一スロットへのドロップ
                        const file = files[0];
                        
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const actualTargetSlot = targetSlot; 
                                
                                const existingThumbnail = getExistingThumbnail(actualTargetSlot);
                                if (existingThumbnail) {
                                    actualTargetSlot.removeChild(existingThumbnail);
                                    cardPreviewArea.innerHTML = '<p>カードにカーソルを合わせてください</p>';
                                    resetSlotToDefault(actualTargetSlot);
                                }
                                
                                // ⭐修正: ベースIDでチェック & このインスタンスの isDecorationMode を参照
                                const isDecoration = isDecorationMode && decorationZones.includes(targetParentBaseId);
                                createCardThumbnail(event.target.result, actualTargetSlot, isDecoration);
                                
                                // ⭐修正: ベースIDでチェック
                                if (targetParentBaseId === 'mana') {
                                    const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                    updateManaCounterValue(currentValue + 1);
                                }
                                
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

        function performCount(isLPButton, value) {
            if (isLPButton) {
                updateLPCounterValue(value);
            } else {
                let currentValue = parseInt(manaCounterValueElement.value) || 0;
                updateManaCounterValue(currentValue + value);
            }
        }

        function stopAction() {
            clearTimeout(initialTimer);
            clearInterval(repeatTimer);
            initialTimer = null;
            repeatTimer = null;
        }

        function startRepeat(isLPButton, value) {
            repeatTimer = setInterval(() => {
                performCount(isLPButton, value);
            }, repeatInterval);
        }

        // ⭐修正: このインスタンスのラッパー内の要素のみを対象にする
        wrapperElement.querySelectorAll(`#${idPrefix}lp-counter-group .counter-btn, #${idPrefix}mana-counter-group .counter-btn`).forEach(button => {
            if (button.id.endsWith('auto-decrease-btn')) {
                return;
            }
            
            const value = parseInt(button.dataset.value);
            // ⭐修正: プレフィックス付きIDでチェック
            const isLPButton = button.closest('#' + idPrefix + 'lp-counter-group') !== null; 

            const startActionHandler = (e) => {
                if (e.button !== undefined && e.button !== 0) return; 
                if (initialTimer || repeatTimer) return;
                
                performCount(isLPButton, value);
                initialTimer = setTimeout(() => startRepeat(isLPButton, value), initialDelay);
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
                    
                    // ⭐修正: ベースIDでチェック
                    const isSideDeckZone = (baseParentZoneId === 'side-deck' || baseParentZoneId === 'side-deck-back-slots');

                    resetSlotToDefault(slot);

                    if (isSideDeckZone) {
                        return; 
                    }

                    const thumbnail = slot.querySelector('.thumbnail');
                    if (thumbnail && thumbnail.dataset.isDecoration !== 'true') { 
                        slot.removeChild(thumbnail);
                        cardThumbnails.push(thumbnail);
                    }
                });

                cardPreviewArea.innerHTML = '<p>カードにカーソルを合わせてください</p>';
                lpCounterValueElement.value = 8000;
                updateManaCounterValue(0); 

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
                    const thumbnail = slot.querySelector('.thumbnail');
                    if (thumbnail) {
                        slot.removeChild(thumbnail);
                        currentDeckThumbnails.push(thumbnail);
                    }
                });
                
                shuffleArray(currentDeckThumbnails); 
                
                for (let i = 0; i < currentDeckThumbnails.length; i++) {
                     if (allDeckSlots[i]) {
                        allDeckSlots[i].appendChild(currentDeckThumbnails[i]);
                        resetSlotToDefault(allDeckSlots[i]); 
                    }
                }
                
                for (let i = 0; i < 5; i++) {
                    if (!drawCard()) break; 
                }

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
                    }, 200);
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

        // -----------------------------------------------------
        // 6. 初期化実行
        // -----------------------------------------------------
        
        // (L591) 全てのスロットにイベントリスナーを設定
        cardSlots.forEach(addSlotEventListeners);

        // (L1267) メインゾーンの画像と枚数を初期化
        syncMainZoneImage('deck');
        syncMainZoneImage('grave');
        syncMainZoneImage('exclude');
        syncMainZoneImage('side-deck');

        // (L1309) サイトロード時（初期状態）にデッキ内を開く
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