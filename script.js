document.addEventListener('DOMContentLoaded', () => {

    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('Files')) {
            e.dataTransfer.dropEffect = 'none';
        }
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
    });
    
    let draggedItem = null; 
    
    const nonRotatableZones = ['deck', 'grave', 'exclude', 'hand-zone', 'deck-back-slots', 'side-deck', 'grave-back-slots', 'exclude-back-slots', 'side-deck-back-slots']; 
    
    const decorationZones = ['exclude', 'side-deck', 'grave', 'deck'];

    const stackableZones = ['battle', 'spell', 'mana', 'special1', 'special2'];

    const contextMenu = document.getElementById('custom-context-menu');
    
    const deleteMenuItem = document.getElementById('context-menu-delete');
    const toGraveMenuItem = document.getElementById('context-menu-to-grave');
    const toExcludeMenuItem = document.getElementById('context-menu-to-exclude');
    const toHandMenuItem = document.getElementById('context-menu-to-hand');
    const toDeckMenuItem = document.getElementById('context-menu-to-deck');
    const toSideDeckMenuItem = document.getElementById('context-menu-to-side-deck');
    const flipMenuItem = document.getElementById('context-menu-flip'); 
    const memoMenuItem = document.getElementById('context-menu-memo'); 
    const addCounterMenuItem = document.getElementById('context-menu-add-counter');
    const removeCounterMenuItem = document.getElementById('context-menu-remove-counter');

    let currentDeleteHandler = null; 
    let currentMoveToGraveHandler = null;
    let currentMoveToExcludeHandler = null;
    let currentMoveToHandHandler = null;
    let currentMoveToDeckHandler = null;
    let currentMoveToSideDeckHandler = null;
    let currentFlipHandler = null; 
    let currentMemoHandler = null; 
    let currentAddCounterHandler = null;
    let currentRemoveCounterHandler = null;

    const memoEditorModal = document.getElementById('memo-editor');
    const memoTextarea = document.getElementById('memo-editor-textarea');
    const memoSaveBtn = document.getElementById('memo-editor-save');
    const memoCancelBtn = document.getElementById('memo-editor-cancel');
    const memoTooltip = document.getElementById('memo-tooltip');
    let currentMemoTarget = null; 
    

    const lightboxOverlay = document.getElementById('lightbox-overlay');
    const lightboxImage = document.getElementById('lightbox-image');
    
    if (!contextMenu || !deleteMenuItem || !toGraveMenuItem || !toExcludeMenuItem || !toHandMenuItem || !toDeckMenuItem || !toSideDeckMenuItem || !flipMenuItem || !addCounterMenuItem || !removeCounterMenuItem
        || !memoMenuItem || !memoEditorModal || !memoTextarea || !memoSaveBtn || !memoCancelBtn || !memoTooltip
        || !lightboxOverlay || !lightboxImage
    ) { 
        console.error("カスタムコンテキストメニューまたはメモ編集モーダル、ライトボックスの必須要素が見つかりません。");
        return; 
    }
    
    function closeLightbox() {
        lightboxOverlay.classList.remove('show');
    }

    lightboxOverlay.addEventListener('click', (e) => {
        closeLightbox();
    });

    lightboxImage.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    if (!contextMenu || !deleteMenuItem || !toGraveMenuItem || !toExcludeMenuItem || !toHandMenuItem || !toDeckMenuItem || !toSideDeckMenuItem || !flipMenuItem || !addCounterMenuItem || !removeCounterMenuItem
        || !memoMenuItem || !memoEditorModal || !memoTextarea || !memoSaveBtn || !memoCancelBtn || !memoTooltip) { 
        console.error("カスタムコンテキストメニューまたはメモ編集モーダルの必須要素が見つかりません。");
        return; 
    }
    
    function closeContextMenu() {
        contextMenu.style.display = 'none';
        currentDeleteHandler = null;
        currentMoveToGraveHandler = null;
        currentMoveToExcludeHandler = null;
        currentMoveToHandHandler = null;
        currentMoveToDeckHandler = null;
        currentMoveToSideDeckHandler = null;
        currentFlipHandler = null; 
        currentMemoHandler = null;
        currentAddCounterHandler = null;
        currentRemoveCounterHandler = null;
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('#custom-context-menu')) return;
        
        if (memoEditorModal.style.display === 'block') {
            if (e.target.closest('#memo-editor')) {
                return;
            }
            return; 
        }
        
        closeContextMenu(); 
    });
    
    contextMenu.addEventListener('contextmenu', (e) => e.preventDefault());

    deleteMenuItem.addEventListener('click', () => {
        if (typeof currentDeleteHandler === 'function') {
            currentDeleteHandler(); 
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

    memoMenuItem.addEventListener('click', () => {
        if (typeof currentMemoHandler === 'function') {
            currentMemoHandler();
        }
        closeContextMenu();
    });
    
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
    
    function performMemoSave() {
        if (currentMemoTarget) {
            const newMemo = memoTextarea.value;
            if (newMemo) {
                currentMemoTarget.dataset.memo = newMemo;
            } else {
                delete currentMemoTarget.dataset.memo; 
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
    
    document.addEventListener('mousemove', (e) => {
        if (memoTooltip.style.display === 'block') {
            memoTooltip.style.left = (e.pageX + 10) + 'px';
            memoTooltip.style.top = (e.pageY + 10) + 'px';
            
            const rect = memoTooltip.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                memoTooltip.style.left = (e.pageX - rect.width - 10) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                memoTooltip.style.top = (e.pageY - rect.height - 10) + 'px';
            }
        }
    });
    
    function getBaseId(prefixedId) {
        if (!prefixedId) return null;
        return prefixedId.replace('opponent-', '');
    }

    function getCardDimensions() {
        const rootStyles = getComputedStyle(document.documentElement);
        const width = parseFloat(rootStyles.getPropertyValue('--card-width').replace('px', '')) || 70;
        const height = parseFloat(rootStyles.getPropertyValue('--card-height').replace('px', '')) || 124.7;
        return { width, height };
    }
    
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

    function resetSlotToDefault(slotElement) {
        slotElement.classList.remove('rotated-90');
        const imgElement = slotElement.querySelector('.thumbnail img');
        if (imgElement) {
            imgElement.style.transform = `rotate(0deg)`;
            imgElement.dataset.rotation = 0;
        }
    }
    
    function getExistingThumbnail(slotElement) {
        const thumbnails = slotElement.querySelectorAll('.thumbnail');
        if (thumbnails.length > 0) {
            return thumbnails[thumbnails.length - 1]; 
        }
        return null;
    }

    function getParentZoneId(slotElement) {
        
        const backSlotArea = slotElement.closest('.sidebar-slot-area');
        if (backSlotArea) {
            return backSlotArea.id; 
        }
        
        const freeSpaceArea = slotElement.closest('.sidebar-bottom-half');
        if (freeSpaceArea) {
            return freeSpaceArea.id; 
        }

        const handZone = slotElement.closest('.hand-zone-slots');
        if (handZone) {
            return handZone.id; 
        }

        const parentZone = slotElement.closest('.zone');
        if (parentZone) {
            return parentZone.id; 
        }

        let parentZoneId = null;
        const grandParent = slotElement.parentNode.parentNode;
        
        if (grandParent && grandParent.id) {
            parentZoneId = grandParent.id;
        } 
        else if (slotElement.parentNode.classList.contains('hand-zone-slots')) {
            parentZoneId = slotElement.parentNode.id; 
        } 
        else if (slotElement.parentNode.classList.contains('deck-back-slot-container')) {
            const container = slotElement.parentNode;
            if (container.parentNode.parentNode.id) { 
                parentZoneId = container.parentNode.parentNode.id; 
            }
        }
        else if (slotElement.parentNode.classList.contains('free-space-slot-container')) {
             const container = slotElement.parentNode;
             if (container.parentNode.id) { 
                parentZoneId = container.parentNode.id;
             }
        }
        else if (slotElement.parentNode.parentNode.classList.contains('hand-controls-top-wrapper')) {
            parentZoneId = slotElement.id; 
        } 
        else if (slotElement.id) {
            if (['deck', 'grave', 'exclude', 'side-deck'].includes(getBaseId(slotElement.id))) {
                parentZoneId = slotElement.id;
            }
        }
        
        if (parentZoneId) {
             return parentZoneId;
        }

        return null; 
    }

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


    function initializeBoard(wrapperSelector, idPrefix) {
        
        const wrapperElement = document.querySelector(wrapperSelector);
        if (!wrapperElement) {
            console.error("ラッパー要素が見つかりません:", wrapperSelector);
            return;
        }

        let isDecorationMode = false;
        let lpDecreaseTimer = null;
        let manaDecreaseTimer = null;

        const cardSlots = wrapperElement.querySelectorAll('.card-slot');
        const cardPreviewArea = document.getElementById(idPrefix + 'card-preview');
        const decorationModeBtn = document.getElementById(idPrefix + 'decoration-mode-btn'); 
        const lpAutoDecreaseBtn = document.getElementById(idPrefix + 'lp-auto-decrease-btn');
        const manaAutoDecreaseBtn = document.getElementById(idPrefix + 'mana-auto-decrease-btn');
        const lpCounterValueElement = document.getElementById(idPrefix + 'counter-value');
        const manaCounterValueElement = document.getElementById(idPrefix + 'mana-counter-value');
        const turnCounterValueElement = document.getElementById(idPrefix + 'turn-counter-value'); 
        
        const smToggleBtn = document.getElementById(idPrefix + 'sm-toggle-btn');
        
        const handZoneId = idPrefix + 'hand-zone'; 
        const deckBackSlotsId = idPrefix + 'deck-back-slots'; 
        const handZone = document.getElementById(handZoneId);
        const deckBackSlotsContainer = document.getElementById(deckBackSlotsId);

        const freeSpaceSlotsContainer = document.getElementById(idPrefix + 'free-space-slots');
        let freeSpaceSlots = [];
        if (freeSpaceSlotsContainer) {
            freeSpaceSlots = freeSpaceSlotsContainer.querySelectorAll('.card-slot');
        }
        
        if (!cardPreviewArea || !lpCounterValueElement || !manaCounterValueElement || !turnCounterValueElement || !handZone || !deckBackSlotsContainer) { 
            console.warn(`初期化スキップ: ${wrapperSelector} の必須要素が見つかりません。`);
            return;
        }
        
        cardPreviewArea.addEventListener('click', () => {
            const previewImg = cardPreviewArea.querySelector('img');
            
            if (previewImg && previewImg.src) {
                lightboxImage.src = previewImg.src;
                lightboxOverlay.classList.add('show');
            }
        });
        
        const deckBackSlots = deckBackSlotsContainer.querySelector('.deck-back-slot-container');
        if (!deckBackSlots) {
            console.warn(`初期化スキップ: ${wrapperSelector} の .deck-back-slot-container が見つかりません。`);
            return;
        }

        function updateSlotStackState(slotElement) {
            if (!slotElement) return;
            
            const thumbnailCount = slotElement.querySelectorAll('.thumbnail:not([data-is-decoration="true"])').length;
            
            if (thumbnailCount > 1) {
                slotElement.classList.add('stacked');
            } else {
                slotElement.classList.remove('stacked');
            }
        }


        function arrangeSlots(containerId) {
            const container = document.getElementById(containerId); 
            if (!container) return;
            
            const baseId = getBaseId(containerId);
            
            if (baseId === 'free-space-slots') {
                return;
            }
            
            const slotsContainer = (baseId === 'hand-zone') ? container : container.querySelector('.deck-back-slot-container') || container;
            
            const slots = Array.from(slotsContainer.querySelectorAll('.card-slot'));
            let cardThumbnails = [];

            slots.forEach(slot => {
                const thumbnails = slot.querySelectorAll('.thumbnail');
                thumbnails.forEach(thumbnail => {
                    slot.removeChild(thumbnail);
                    cardThumbnails.push(thumbnail);
                });
                
                if (thumbnails.length > 0) {
                    resetSlotToDefault(slot); 
                    updateSlotStackState(slot); 
                }
            });

            for (let i = 0; i < cardThumbnails.length; i++) {
                if (slots[i]) {
                    slots[i].appendChild(cardThumbnails[i]);
                    const imgElement = cardThumbnails[i].querySelector('.card-image');
                    if (imgElement) {
                        imgElement.style.transform = `rotate(0deg)`;
                        imgElement.dataset.rotation = 0;
                    }
                    updateSlotStackState(slots[i]); 
                }
            }
        }

        function updateLPCounterValue(valueChange) {
            let currentValue = parseInt(lpCounterValueElement.value) || 0;
            currentValue += valueChange;
            if (currentValue < 0) currentValue = 0; 
            lpCounterValueElement.value = currentValue;
        }

        function updateManaCounterValue(newValue) {
            let value = Math.max(0, newValue); 
            manaCounterValueElement.value = value;
        }

        function updateTurnCounterValue(newValue) {
            let value = Math.max(0, newValue); 
            turnCounterValueElement.value = value;
        }

        function syncMainZoneImage(baseZoneId) {
            const mainZone = document.getElementById(idPrefix + baseZoneId);
            if (!mainZone) return;

            const mainSlot = mainZone.querySelector('.card-slot');
            if (!mainSlot) return;

            const backSlotsId = `${idPrefix}${baseZoneId}-back-slots`;
            const backSlotsContainer = document.getElementById(backSlotsId);
            
            if (baseZoneId === 'free-space-slots') {
                return;
            }
            
            const backSlots = backSlotsContainer ? backSlotsContainer.querySelector('.deck-back-slot-container') : null;
            
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
                    targetCardThumbnail = occupiedThumbnails[0];
                } else if (baseZoneId === 'grave' || baseZoneId === 'exclude') {
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
        
        function moveCardToMultiZone(thumbnailElement, targetBaseZoneId) {
            const sourceSlot = thumbnailElement.parentNode;
            if (!sourceSlot) return; 
            
            const sourceZoneId = getParentZoneId(sourceSlot);
            const sourceBaseZoneId = getBaseId(sourceZoneId);
            
            const isTargetHand = (targetBaseZoneId === 'hand');
            const destinationMultiZoneId = idPrefix + (isTargetHand ? 'hand-zone' : targetBaseZoneId + '-back-slots');
            
            if (sourceBaseZoneId === targetBaseZoneId || sourceZoneId === destinationMultiZoneId) {
                return; 
            }
            
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
                console.warn(`「${targetBaseZoneId}」がいっぱいです。`);
                return;
            }

            
            const imgElement = thumbnailElement.querySelector('.card-image');
            if (imgElement && sourceBaseZoneId === 'mana') {
                let currentRotation = parseInt(imgElement.dataset.rotation) || 0;
                if (currentRotation === 90) {
                    const currentValue = parseInt(manaCounterValueElement.value) || 0;
                    updateManaCounterValue(currentValue - 1);
                }
            }

            sourceSlot.removeChild(thumbnailElement);
            resetSlotToDefault(sourceSlot);
            updateSlotStackState(sourceSlot); 

            emptySlot.appendChild(thumbnailElement);
            
            resetCardFlipState(thumbnailElement);
            
            resetSlotToDefault(emptySlot); 
            
            const sourceIsMultiZone = ['hand-zone', 'deck-back-slots', 'grave-back-slots', 'exclude-back-slots', 'side-deck-back-slots'].includes(sourceBaseZoneId);
            if (sourceIsMultiZone) {
                arrangeSlots(sourceZoneId);
                if (sourceBaseZoneId !== 'hand-zone') {
                    syncMainZoneImage(sourceBaseZoneId.replace('-back-slots', ''));
                }
            } 
            else if (decorationZones.includes(sourceBaseZoneId)) {
                 syncMainZoneImage(sourceBaseZoneId);
            }
            else if (sourceBaseZoneId === 'free-space-slots') {
            }

            arrangeSlots(destinationMultiZoneId);
            if (!isTargetHand) {
                syncMainZoneImage(targetBaseZoneId);
            }
        }

        
        function createCardThumbnail(cardData, slotElement, insertAtBottom = false) {
            
            let imageSrc, isDecoration, isFlipped, originalSrc, counter, memo; 

            if (typeof cardData === 'string') {
                imageSrc = cardData;
                isDecoration = arguments[2] || false; 
                insertAtBottom = arguments[3] || false; 
                isFlipped = false;
                originalSrc = null;
                counter = 0;
                memo = ''; 
            } else {
                imageSrc = cardData.src;
                isDecoration = cardData.isDecoration || false;
                isFlipped = cardData.isFlipped || false;
                originalSrc = cardData.originalSrc || null;
                counter = cardData.counter || 0;
                memo = cardData.memo || ''; 
            }
            
            const thumbnailElement = document.createElement('div');
            thumbnailElement.classList.add('thumbnail');
            thumbnailElement.setAttribute('draggable', true); 
            
            if (isDecoration) {
                thumbnailElement.dataset.isDecoration = 'true';
            }

            const imgElement = document.createElement('img');
            imgElement.classList.add('card-image');
            imgElement.dataset.rotation = 0; 
            
            if (isFlipped && originalSrc) {
                thumbnailElement.dataset.isFlipped = 'true';
                thumbnailElement.dataset.originalSrc = originalSrc;
                imgElement.src = imageSrc; 
            } else {
                thumbnailElement.dataset.isFlipped = 'false';
                imgElement.src = imageSrc; 
            }
                    
            thumbnailElement.appendChild(imgElement);
            
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
            
            if (memo) {
                thumbnailElement.dataset.memo = memo;
            }
            
            if (insertAtBottom) {
                const firstCard = slotElement.querySelector('.thumbnail');
                if (firstCard) {
                    slotElement.insertBefore(thumbnailElement, firstCard);
                } else {
                    slotElement.appendChild(thumbnailElement); 
                }
            } else {
                slotElement.appendChild(thumbnailElement); 
            }
            
            const parentZoneId = getParentZoneId(slotElement);
            const baseParentZoneId = getBaseId(parentZoneId); 
            
            if (baseParentZoneId === 'deck-back-slots' || baseParentZoneId === 'grave-back-slots' || baseParentZoneId === 'exclude-back-slots' || baseParentZoneId === 'side-deck-back-slots') {
                syncMainZoneImage(baseParentZoneId.replace('-back-slots', ''));
            }
            else if (baseParentZoneId === 'free-space-slots') {
            }

            thumbnailElement.addEventListener('dragstart', (e) => {
                if (thumbnailElement.dataset.isDecoration === 'true' && !isDecorationMode) {
                    e.preventDefault();
                    return;
                }
                
                draggedItem = thumbnailElement; 
                setTimeout(() => {
                    thumbnailElement.style.visibility = 'hidden';
                }, 0);
                e.dataTransfer.setData('text/plain', ''); 
            });

            thumbnailElement.addEventListener('dragend', () => {
                thumbnailElement.style.visibility = 'visible';
                draggedItem = null; 
            });

            thumbnailElement.addEventListener('click', (e) => {
                
                if (contextMenu.style.display === 'block') {
                    return;
                }
                
                if (memoEditorModal.style.display === 'block') {
                    return;
                }

                if (draggedItem) return; 
                
                if (thumbnailElement.dataset.isDecoration === 'true') {
                     e.stopPropagation(); 
                    return;
                }

                const slotElement = thumbnailElement.parentNode; 
                const topCard = getExistingThumbnail(slotElement); 
                if (thumbnailElement !== topCard) {
                    e.stopPropagation();
                    return;
                }
                
                const imgElement = thumbnailElement.querySelector('.card-image');
                if (!imgElement) return;

                let parentZoneId = getParentZoneId(slotElement);
                let baseParentZoneId = getBaseId(parentZoneId); 

                if (nonRotatableZones.includes(baseParentZoneId) || baseParentZoneId === 'free-space-slots') {
                    e.stopPropagation(); 
                    return;
                }
                
                let currentRotation = parseInt(imgElement.dataset.rotation) || 0;
                
                if (currentRotation === 0) {
                    currentRotation = 90;
                    slotElement.classList.add('rotated-90');
                    
                    const { width, height } = getCardDimensions();
                    const scaleFactor = height / width;
                    imgElement.style.transform = `rotate(${currentRotation}deg) scale(${scaleFactor})`;
                    
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
            
            thumbnailElement.addEventListener('contextmenu', (e) => {
                e.preventDefault(); 
                e.stopPropagation(); 
                
                if (memoEditorModal.style.display === 'block') {
                    return;
                }

                const performDelete = () => {
                    if (thumbnailElement.dataset.isDecoration === 'true' && !isDecorationMode) {
                        return;
                    }
                    
                    const slotElement = thumbnailElement.parentNode;
                    if (!slotElement) return;
                     
                    const parentZoneId = getParentZoneId(slotElement);
                    const baseParentZoneId = getBaseId(parentZoneId); 
                    
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

                    updateSlotStackState(slotElement);
                    
                    draggedItem = null; 
                    
                    if (baseParentZoneId === 'deck-back-slots' || baseParentZoneId === 'grave-back-slots' || baseParentZoneId === 'exclude-back-slots' || baseParentZoneId === 'side-deck-back-slots') {
                        arrangeSlots(parentZoneId);
                        syncMainZoneImage(baseParentZoneId.replace('-back-slots', ''));
                    } else if (baseParentZoneId === 'hand-zone') {
                        arrangeSlots(parentZoneId); 
                    }
                    else if (thumbnailElement.dataset.isDecoration === 'true') {
                         syncMainZoneImage(baseParentZoneId);
                    }
                    else if (baseParentZoneId === 'free-space-slots') {
                    }
                };

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
                
                const performMemoEdit = () => {
                    currentMemoTarget = thumbnailElement;
                    memoTextarea.value = thumbnailElement.dataset.memo || '';
                    memoEditorModal.style.display = 'block';
                    memoTextarea.focus();
                };
                
                if (thumbnailElement.dataset.isDecoration === 'true' && !isDecorationMode) {
                    return;
                }

                currentDeleteHandler = performDelete;
                currentMoveToGraveHandler = () => moveCardToMultiZone(thumbnailElement, 'grave');
                currentMoveToExcludeHandler = () => moveCardToMultiZone(thumbnailElement, 'exclude');
                currentMoveToHandHandler = () => moveCardToMultiZone(thumbnailElement, 'hand');
                currentMoveToDeckHandler = () => moveCardToMultiZone(thumbnailElement, 'deck');
                currentMoveToSideDeckHandler = () => moveCardToMultiZone(thumbnailElement, 'side-deck');

                currentAddCounterHandler = performAddCounter;
                currentRemoveCounterHandler = performRemoveCounter;
                currentMemoHandler = performMemoEdit; 
                
                const performFlip = () => {
                    const imgElement = thumbnailElement.querySelector('.card-image');
                    if (!imgElement) return;

                    const isFlipped = thumbnailElement.dataset.isFlipped === 'true';

                    if (isFlipped) {
                        resetCardFlipState(thumbnailElement);
                    } else {
                        
                        const deckZone = document.getElementById(idPrefix + 'deck');
                        let deckImgSrc = './decoration/デッキ.png'; 
                        
                        if (deckZone) {
                            const decoratedThumbnail = deckZone.querySelector('.thumbnail[data-is-decoration="true"]');
                            if (decoratedThumbnail) {
                                const decoratedImg = decoratedThumbnail.querySelector('.card-image');
                                if (decoratedImg) {
                                    deckImgSrc = decoratedImg.src;
                                }
                            }
                        }
                        
                        thumbnailElement.dataset.originalSrc = imgElement.src;
                        imgElement.src = deckImgSrc;
                        thumbnailElement.dataset.isFlipped = 'true';
                    }
                    
                    const slotElement = thumbnailElement.parentNode;
                    const parentZoneId = getParentZoneId(slotElement);
                    const baseParentZoneId = getBaseId(parentZoneId);
            
                    if (baseParentZoneId === 'deck-back-slots' || baseParentZoneId === 'grave-back-slots' || baseParentZoneId === 'exclude-back-slots' || baseParentZoneId === 'side-deck-back-slots') {
                        syncMainZoneImage(baseParentZoneId.replace('-back-slots', ''));
                    }
                };
                
                currentFlipHandler = performFlip;


                const sourceZoneId = getParentZoneId(thumbnailElement.parentNode);
                const sourceBaseId = getBaseId(sourceZoneId); 

                const setItemVisibility = (item, targetBaseId) => {
                    const isTargetHand = (targetBaseId === 'hand');
                    const targetMultiZoneId = isTargetHand ? 'hand-zone' : (targetBaseId + '-back-slots');
                    
                    if (sourceBaseId === targetBaseId || sourceBaseId === targetMultiZoneId) {
                        item.style.display = 'none';
                    } else {
                        item.style.display = 'block';
                    }
                };

                setItemVisibility(toGraveMenuItem, 'grave');
                setItemVisibility(toExcludeMenuItem, 'exclude');
                setItemVisibility(toHandMenuItem, 'hand');
                setItemVisibility(toDeckMenuItem, 'deck');
                setItemVisibility(toSideDeckMenuItem, 'side-deck');
                
                const isNonRotatable = nonRotatableZones.includes(sourceBaseId);
                const isHandZone = (sourceBaseId === 'hand-zone');
                const isFreeSpace = (sourceBaseId === 'free-space-slots');
                
                if ((isNonRotatable && !isHandZone) || isFreeSpace || thumbnailElement.dataset.isDecoration === 'true') {
                    flipMenuItem.style.display = 'none';
                } else {
                    flipMenuItem.style.display = 'block';
                }
                
                if (thumbnailElement.dataset.isDecoration === 'true') {
                    addCounterMenuItem.style.display = 'none';
                    removeCounterMenuItem.style.display = 'none';
                    memoMenuItem.style.display = 'none';
                } else {
                    memoMenuItem.style.display = 'block';
                    
                    if (stackableZones.includes(sourceBaseId)) {
                        addCounterMenuItem.style.display = 'block';
                        removeCounterMenuItem.style.display = 'block';
                    } else {
                        addCounterMenuItem.style.display = 'none';
                        removeCounterMenuItem.style.display = 'none';
                    }
                }
                
                deleteMenuItem.style.display = 'block'; 

                contextMenu.style.visibility = 'hidden';
                contextMenu.style.display = 'block';
                const menuWidth = contextMenu.offsetWidth;
                const menuHeight = contextMenu.offsetHeight;
                contextMenu.style.display = 'none'; 
                contextMenu.style.visibility = 'visible';

                let left = e.pageX;
                let top = e.pageY - (menuHeight / 2);
                
                contextMenu.style.top = `${top}px`;
                contextMenu.style.left = `${left}px`;
                contextMenu.style.display = 'block';
            });
            
            thumbnailElement.addEventListener('mouseover', (e) => {
                
                const imgElement = thumbnailElement.querySelector('.card-image');
                if (!imgElement) return;

                cardPreviewArea.innerHTML = ''; 
                const previewImg = document.createElement('img');
                
                if (thumbnailElement.dataset.isFlipped === 'true') {
                    previewImg.src = thumbnailElement.dataset.originalSrc || imgElement.src;
                } else {
                    previewImg.src = imgElement.src;
                }
                
                cardPreviewArea.appendChild(previewImg);
                
                const memo = thumbnailElement.dataset.memo;
                if (memo) {
                    memoTooltip.textContent = memo;
                    memoTooltip.style.display = 'block';
                }
                
                e.stopPropagation(); 
            });
            
            thumbnailElement.addEventListener('mouseout', (e) => {
                memoTooltip.style.display = 'none';
                e.stopPropagation();
            });
        }

        function toggleSidebarContent(targetId) { 
            const sidebarContainer = document.getElementById(idPrefix + 'sidebar-container');
            if (!sidebarContainer) return;

            const targetElement = document.getElementById(targetId);
            
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

        function addSlotEventListeners(slot) {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation(); 
                if (e.dataTransfer.types.includes('Files')) {
                    e.dataTransfer.dropEffect = 'copy';
                } else {
                    e.dataTransfer.dropEffect = 'move'; 
                }
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');

                if (e.dataTransfer.files.length > 0) {
                    return;
                }
                
                e.stopPropagation(); 

                if (draggedItem) { 
                    
                    if (draggedItem.dataset.isDecoration === 'true' && !isDecorationMode) {
                        console.log("装飾モードでないため、装飾カードを移動できません。");
                        return;
                    }

                    const sourceSlot = draggedItem.parentNode;
                    const sourceZoneId = getParentZoneId(sourceSlot);
                    const sourceBaseZoneId = getBaseId(sourceZoneId); 
                    
                    let actualTargetSlot = slot;
                    let targetZoneId = getParentZoneId(slot);
                    let targetBaseZoneId = getBaseId(targetZoneId); 

                    const imgElement = draggedItem.querySelector('.card-image');
                    let cardRotation = parseInt(imgElement.dataset.rotation) || 0;
                    
                    if (sourceBaseZoneId === 'mana' && cardRotation === 90) {
                        const currentValue = parseInt(manaCounterValueElement.value) || 0;
                        updateManaCounterValue(currentValue - 1);
                    }

                    let sourceArrangementId = null;
                    if (sourceBaseZoneId === 'deck-back-slots' || sourceBaseZoneId === 'grave-back-slots' || sourceBaseZoneId === 'exclude-back-slots' || sourceBaseZoneId === 'side-deck-back-slots' || sourceBaseZoneId === 'hand-zone') {
                        sourceArrangementId = sourceZoneId; 
                    }
                    
                    let destinationArrangementId = null;

                    if (targetBaseZoneId === 'deck') destinationArrangementId = idPrefix + 'deck-back-slots';
                    else if (targetBaseZoneId === 'grave') destinationArrangementId = idPrefix + 'grave-back-slots';
                    else if (targetBaseZoneId === 'exclude') destinationArrangementId = idPrefix + 'exclude-back-slots';
                    else if (targetBaseZoneId === 'side-deck') destinationArrangementId = idPrefix + 'side-deck-back-slots';
                    else if (targetBaseZoneId === 'deck-back-slots' || targetBaseZoneId === 'grave-back-slots' || targetBaseZoneId === 'exclude-back-slots' || targetBaseZoneId === 'side-deck-back-slots') {
                        destinationArrangementId = targetZoneId; 
                    } else if (targetBaseZoneId === 'hand-zone') {
                        destinationArrangementId = targetZoneId; 
                    }
                    else if (targetBaseZoneId === 'free-space-slots') {
                        destinationArrangementId = null; 
                    }


                    const isTargetMainZoneSlot = ['deck', 'grave', 'exclude', 'side-deck'].includes(targetBaseZoneId);

                        if (destinationArrangementId) {
                        
                        if (isDecorationMode && getBaseId(destinationArrangementId) !== 'hand-zone') {
                            console.log("装飾モード中は裏面スロットへのカード移動はできません。");
                            
                            if (sourceBaseZoneId === 'mana' && cardRotation === 90) {
                                const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                updateManaCounterValue(currentValue + 1);
                            }
                            return; 
                        }
                        
                        const destinationContainer = document.getElementById(destinationArrangementId);
                        const slotsContainer = (getBaseId(destinationArrangementId) === 'hand-zone') ? destinationContainer : destinationContainer.querySelector('.deck-back-slot-container') || destinationContainer;
                        
                        if (isTargetMainZoneSlot) {
                            const emptySlot = Array.from(slotsContainer.querySelectorAll('.card-slot')).find(s => !s.querySelector('.thumbnail'));
                            if (emptySlot) {
                                actualTargetSlot = emptySlot;
                                targetZoneId = getParentZoneId(actualTargetSlot); 
                            } else {
                                console.log(`${destinationArrangementId} スロットが全て埋まっています。移動できません。`);
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
                        
                        updateSlotStackState(sourceSlot);
                        
                        if (sourceArrangementId) {
                            arrangeSlots(sourceArrangementId);
                            if (getBaseId(sourceArrangementId) !== 'hand-zone') {
                                syncMainZoneImage(getBaseId(sourceArrangementId).replace('-back-slots', ''));
                            }
                        }
                        
                        if (destinationArrangementId) {
                            arrangeSlots(destinationArrangementId);
                            if (getBaseId(destinationArrangementId) !== 'hand-zone') {
                                syncMainZoneImage(getBaseId(destinationArrangementId).replace('-back-slots', ''));
                            }
                        }

                    } else {
                        
                        const isTargetStackable = stackableZones.includes(targetBaseZoneId) && (targetBaseZoneId !== 'free-space-slots');
                        const existingThumbnail = getExistingThumbnail(actualTargetSlot);

                        if (isTargetStackable) {
                            sourceSlot.removeChild(draggedItem);
                            resetSlotToDefault(sourceSlot);
                            
                            
                            const firstCard = actualTargetSlot.querySelector('.thumbnail');
                            if (firstCard) {
                                actualTargetSlot.insertBefore(draggedItem, firstCard);
                            } else {
                                actualTargetSlot.appendChild(draggedItem); 
                            }
                            
                            if (sourceArrangementId) {
                                arrangeSlots(sourceArrangementId);
                                if (getBaseId(sourceArrangementId) !== 'hand-zone') {
                                    syncMainZoneImage(getBaseId(sourceArrangementId).replace('-back-slots', ''));
                                }
                            } else {
                                updateSlotStackState(sourceSlot);
                            }
                            
                            updateSlotStackState(actualTargetSlot);
                        }

                        else if (existingThumbnail && sourceSlot !== actualTargetSlot) {
                            sourceSlot.removeChild(draggedItem);
                            resetSlotToDefault(sourceSlot);
                            
                            resetSlotToDefault(existingThumbnail.parentNode); 
                            sourceSlot.appendChild(existingThumbnail);
                            
                            
                            if (sourceBaseZoneId === 'mana' && existingThumbnail.querySelector('.card-image').dataset.rotation === '90') {
                                const currentValue = parseInt(manaCounterValueElement.value) || 0;
                                updateManaCounterValue(currentValue + 1); 
                            }
                            
                            resetSlotToDefault(actualTargetSlot);
                            actualTargetSlot.appendChild(draggedItem);
                            
                            
                        } else if (!existingThumbnail) {
                            sourceSlot.removeChild(draggedItem);
                            resetSlotToDefault(sourceSlot);
                            actualTargetSlot.appendChild(draggedItem);
                            
                            
                            if (nonRotatableZones.includes(targetBaseZoneId) || targetBaseZoneId === 'free-space-slots') {
                                 resetSlotToDefault(actualTargetSlot);
                            } else {
                                 resetSlotToDefault(actualTargetSlot);
                            }
                        } else {
                            return;
                        }
                        
                        if (sourceArrangementId && !isTargetStackable) {
                            arrangeSlots(sourceArrangementId);
                            if (getBaseId(sourceArrangementId) !== 'hand-zone') {
                                syncMainZoneImage(getBaseId(sourceArrangementId).replace('-back-slots', ''));
                            }
                        }
                    }
                    
                    if (decorationZones.includes(sourceBaseZoneId) && !sourceArrangementId) {
                         syncMainZoneImage(getBaseId(sourceBaseZoneId)); 
                    }
                }
            });
        }
        
        function drawCard() {
            const deckSlots = Array.from(deckBackSlots.querySelectorAll('.card-slot'));
            let cardToDraw = null;
            let sourceSlot = null;

            for (const slot of deckSlots) {
                const thumbnail = slot.querySelector('.thumbnail'); 
                if (thumbnail) {
                    cardToDraw = thumbnail;
                    sourceSlot = slot;
                    break;
                }
            }
            
            if (!cardToDraw || !sourceSlot) {
                console.warn('デッキにカードがありません。');
                return false;
            }

            const handSlots = Array.from(handZone.querySelectorAll('.card-slot'));
            const emptyHandSlot = handSlots.find(slot => !slot.querySelector('.thumbnail'));

            if (!emptyHandSlot) {
                console.warn('手札スロットが全て埋まっています。');
                return false;
            }

            sourceSlot.removeChild(cardToDraw);
            emptyHandSlot.appendChild(cardToDraw);
            
            resetCardFlipState(cardToDraw);
            
            resetSlotToDefault(sourceSlot);
            updateSlotStackState(sourceSlot); 
            resetSlotToDefault(emptyHandSlot);
            
            arrangeSlots(deckBackSlotsId); 
            syncMainZoneImage('deck'); 
            
            return true;
        }


        
        if (decorationModeBtn) {
            decorationModeBtn.addEventListener('click', () => {
                isDecorationMode = !isDecorationMode;
                
                const decorationClass = (idPrefix === 'opponent-') ? 'opponent-decoration-mode-active' : 'player-decoration-mode-active';
                
                if (isDecorationMode) {
                    decorationModeBtn.textContent = 'キャンセル';
                    decorationModeBtn.style.backgroundColor = '#cc0000'; 
                    decorationModeBtn.style.boxShadow = '0 3px #800000';
                    document.body.classList.add(decorationClass); 
                    
                } else {
                    decorationModeBtn.textContent = '装飾モード';
                    decorationModeBtn.style.backgroundColor = '#ffcc00'; 
                    decorationModeBtn.style.boxShadow = '0 3px #997a00';
                    document.body.classList.remove(decorationClass); 
                }
            });
        }
        
        if (smToggleBtn) {
            smToggleBtn.addEventListener('click', () => {
                const currentMode = smToggleBtn.dataset.mode;
                
                const sadistClass = (idPrefix === 'opponent-') ? 'opponent-sadist-mode' : 'player-sadist-mode';

                if (currentMode === 'sadist') {
                    smToggleBtn.dataset.mode = 'masochist';
                    smToggleBtn.textContent = 'マゾヒスト';
                    wrapperElement.classList.remove(sadistClass);
                } else {
                    smToggleBtn.dataset.mode = 'sadist';
                    smToggleBtn.textContent = 'サディスト';
                    wrapperElement.classList.add(sadistClass);
                }
            });
        }

        const dropTargets = wrapperElement.querySelectorAll(
            '#' + idPrefix + 'hand-zone, .sidebar-slot-area, .sidebar-bottom-half, #' + idPrefix + 'deck, #' + idPrefix + 'grave, #' + idPrefix + 'exclude, #' + idPrefix + 'side-deck'
        ); 
        
        dropTargets.forEach(target => {
            target.addEventListener('dragover', (e) => {
                e.preventDefault(); 
                e.stopPropagation(); 
                e.dataTransfer.dropEffect = 'copy'; 
            });
        });

        wrapperElement.addEventListener('drop', (e) => {
            if (e.dataTransfer.files.length === 0) {
                e.preventDefault(); 
                e.stopPropagation(); 
                return;
            }

            e.preventDefault();
            e.stopPropagation(); 
            
            let targetArea = e.target.closest('.zone, .hand-zone-slots, .sidebar-slot-area, .sidebar-bottom-half');

            let targetSlot = e.target.closest('.card-slot'); 
            
            if (targetArea || targetSlot) { 
                
                const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                if (files.length === 0) return;
                
                if (!targetArea && targetSlot) {
                    const parentZoneId = getParentZoneId(targetSlot);
                    if (parentZoneId) {
                        targetArea = document.getElementById(parentZoneId);
                    }
                }
                
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
                                updateSlotStackState(mainSlot); 
                            }
                            
                            createCardThumbnail(event.target.result, mainSlot, true); 
                            syncMainZoneImage(getBaseId(targetArea.id));
                        };
                        reader.readAsDataURL(file);
                    }
                    return; 
                }
                
                let destinationId = null;
                if (targetArea) { 
                    const targetBaseId = getBaseId(targetArea.id); 
                    if (targetBaseId === 'deck') destinationId = idPrefix + 'deck-back-slots';
                    else if (targetBaseId === 'grave') destinationId = idPrefix + 'grave-back-slots';
                    else if (targetBaseId === 'exclude') destinationId = idPrefix + 'exclude-back-slots';
                    else if (targetBaseId === 'side-deck') destinationId = idPrefix + 'side-deck-back-slots';
                    else if (targetBaseId === 'deck-back-slots' || targetBaseId === 'grave-back-slots' || targetBaseId === 'exclude-back-slots' || targetBaseId === 'side-deck-back-slots') {
                        destinationId = targetArea.id; 
                    } else if (targetBaseId === 'hand-zone') {
                        destinationId = targetArea.id; 
                    }
                    else if (targetBaseId === 'free-space-slots') {
                         destinationId = null; 
                    }
                }

                if (destinationId) {
                    
                    if (isDecorationMode && getBaseId(destinationId) !== 'hand-zone') {
                        console.log("装飾モード中は裏面スロットへのファイル追加はできません。");
                        return;
                    }
                    
                    const destinationContainer = document.getElementById(destinationId);
                    const slotsContainer = (getBaseId(destinationId) === 'hand-zone') ? destinationContainer : destinationContainer.querySelector('.deck-back-slot-container') || destinationContainer;
                    const availableSlots = Array.from(slotsContainer.querySelectorAll('.card-slot')).filter(s => !s.querySelector('.thumbnail'));
                    
                    if (availableSlots.length === 0) {
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
                            createCardThumbnail(event.target.result, slot); 
                        };
                        reader.readAsDataURL(file);
                        
                        fileIndex++;
                        slotIndex++;
                    }
                    
                    setTimeout(() => {
                        arrangeSlots(destinationId);
                        if (getBaseId(destinationId) !== 'hand-zone') {
                            syncMainZoneImage(getBaseId(destinationId).replace('-back-slots', ''));
                        }
                    }, 100); 

                } else if (targetSlot) {
                    
                    const targetParentZoneId = getParentZoneId(targetSlot);
                    const targetParentBaseId = getBaseId(targetParentZoneId); 
                    
                    if (!isDecorationMode && decorationZones.includes(targetParentBaseId)) {
                        
                        let destinationId = null;
                        if (targetParentBaseId === 'deck') destinationId = idPrefix + 'deck-back-slots';
                        else if (targetParentBaseId === 'grave') destinationId = idPrefix + 'grave-back-slots';
                        else if (targetParentBaseId === 'exclude') destinationId = idPrefix + 'exclude-back-slots';
                        else if (targetParentBaseId === 'side-deck') destinationId = idPrefix + 'side-deck-back-slots';
                        
                        if (destinationId) {
                            const destinationContainer = document.getElementById(destinationId);
                            const slotsContainer = destinationContainer.querySelector('.deck-back-slot-container') || destinationContainer;
                            const availableSlots = Array.from(slotsContainer.querySelectorAll('.card-slot')).filter(s => !s.querySelector('.thumbnail'));
                            
                            if (availableSlots.length === 0) {
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
                                    createCardThumbnail(event.target.result, slot); 
                                };
                                reader.readAsDataURL(file);
                                
                                fileIndex++;
                                slotIndex++;
                            }
                            
                            setTimeout(() => {
                                arrangeSlots(destinationId);
                                syncMainZoneImage(getBaseId(destinationId).replace('-back-slots', ''));
                            }, 100); 
                        } 
                    } else {
                        const file = files[0];
                        
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const actualTargetSlot = targetSlot; 
                                const targetParentZoneId = getParentZoneId(actualTargetSlot);
                                const targetParentBaseId = getBaseId(targetParentZoneId);
                                
                                const isTargetStackable = stackableZones.includes(targetParentBaseId) && (targetParentBaseId !== 'free-space-slots');
                                const existingThumbnail = getExistingThumbnail(actualTargetSlot);
                                
                                if (!isTargetStackable && existingThumbnail) {
                                    actualTargetSlot.removeChild(existingThumbnail);
                                    
                                    cardPreviewArea.innerHTML = '<p>カードにカーソルを合わせてください</p>';
                                    resetSlotToDefault(actualTargetSlot);
                                }

                                const isDecoration = isDecorationMode && decorationZones.includes(targetParentBaseId);
                                
                                createCardThumbnail(event.target.result, actualTargetSlot, isDecoration, isTargetStackable);
                                
                                if (isTargetStackable && !isDecoration) {
                                    updateSlotStackState(actualTargetSlot);
                                }

                                if (isDecoration) {
                                    syncMainZoneImage(targetParentBaseId);
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                    }
                }
            }
        });

        wrapperElement.querySelectorAll('.zone-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const parentZone = header.closest('.zone');
                if (parentZone) {
                    let targetId = null;
                    const baseId = getBaseId(parentZone.id); 
                    
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

        let repeatTimer = null;
        let initialTimer = null;
        const initialDelay = 300; 
        const repeatInterval = 200;  

        function performCount(counterType, value) { 
            if (counterType === 'lp') { 
                updateLPCounterValue(value);
            } else if (counterType === 'mana') { 
                let currentValue = parseInt(manaCounterValueElement.value) || 0;
                updateManaCounterValue(currentValue + value);
            } else if (counterType === 'turn') { 
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

        function startRepeat(counterType, value) { 
            repeatTimer = setInterval(() => {
                performCount(counterType, value); 
            }, repeatInterval);
        }

        wrapperElement.querySelectorAll(`#${idPrefix}lp-counter-group .counter-btn, #${idPrefix}mana-counter-group .counter-btn, #${idPrefix}turn-counter-group .counter-btn`).forEach(button => { 
            if (button.id.endsWith('auto-decrease-btn')) {
                return;
            }
            
            const value = parseInt(button.dataset.value);
            let counterType = null; 
            if (button.closest('#' + idPrefix + 'lp-counter-group')) { 
                counterType = 'lp';
            } else if (button.closest('#' + idPrefix + 'mana-counter-group')) {
                counterType = 'mana';
            } else if (button.closest('#' + idPrefix + 'turn-counter-group')) { 
                counterType = 'turn';
            }

            const startActionHandler = (e) => {
                if (e.button !== undefined && e.button !== 0) return; 
                if (initialTimer || repeatTimer) return;
                
                performCount(counterType, value); 
                initialTimer = setTimeout(() => startRepeat(counterType, value), initialDelay); 
            };

            button.addEventListener('mousedown', startActionHandler);
            document.addEventListener('mouseup', stopAction); 
            button.addEventListener('mouseleave', stopAction);
            
            button.addEventListener('touchstart', startActionHandler);
            document.addEventListener('touchend', stopAction);
            document.addEventListener('touchcancel', stopAction);
            
            button.addEventListener('dragstart', (e) => e.preventDefault());
        });
        
        const drawButton = document.getElementById(idPrefix + 'draw-card');
        if (drawButton) {
            drawButton.addEventListener('click', drawCard);
        }
        
        
        const shuffleButton = document.getElementById(idPrefix + 'shuffle-deck');
        if (shuffleButton) {
            shuffleButton.addEventListener('click', () => {
                
                if (!deckBackSlots || !deckBackSlotsId) {
                    console.warn("シャッフル対象のデッキコンテナが見つかりません。");
                    return;
                }

                
                const allDeckSlots = Array.from(deckBackSlots.querySelectorAll('.card-slot'));
                let currentDeckThumbnails = [];
                
                allDeckSlots.forEach(slot => {
                    const thumbnails = slot.querySelectorAll('.thumbnail');
                    thumbnails.forEach(thumbnail => {
                        slot.removeChild(thumbnail);
                        currentDeckThumbnails.push(thumbnail);
                    });
                    resetSlotToDefault(slot);
                    updateSlotStackState(slot);
                });

                shuffleArray(currentDeckThumbnails); 
                
                for (let i = 0; i < currentDeckThumbnails.length; i++) {
                     if (allDeckSlots[i]) {
                        allDeckSlots[i].appendChild(currentDeckThumbnails[i]);
                        resetSlotToDefault(allDeckSlots[i]); 
                        updateSlotStackState(allDeckSlots[i]);
                    }
                }
                
                
                syncMainZoneImage('deck'); 
            });
        }

        
        const resetButton = document.getElementById(idPrefix + 'reset-and-draw');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                
                const allSlots = wrapperElement.querySelectorAll('.card-slot');
                let cardThumbnails = [];
                
                allSlots.forEach(slot => {
                    const parentZoneId = getParentZoneId(slot);
                    const baseParentZoneId = getBaseId(parentZoneId); 
                    
                    if (baseParentZoneId === 'free-space-slots') {
                        return; 
                    }
                    
                    const isSideDeckZone = (baseParentZoneId === 'side-deck' || baseParentZoneId === 'side-deck-back-slots');

                    resetSlotToDefault(slot);
                    slot.classList.remove('stacked'); 

                    if (isSideDeckZone) {
                        return; 
                    }

                    const thumbnail = slot.querySelector('.thumbnail');
                    if (thumbnail && thumbnail.dataset.isDecoration !== 'true') { 
                        slot.removeChild(thumbnail);
                        
                        resetCardFlipState(thumbnail);
                        
                        cardThumbnails.push(thumbnail);
                    }
                    
                    const remainingThumbnails = slot.querySelectorAll('.thumbnail:not([data-is-decoration="true"])');
                    remainingThumbnails.forEach(thumb => {
                        slot.removeChild(thumb);
                        
                        resetCardFlipState(thumb);
                        
                        cardThumbnails.push(thumb);
                    });
                });

                cardPreviewArea.innerHTML = '<p>カードにカーソルを合わせてください</p>';
                lpCounterValueElement.value = 20;
                updateManaCounterValue(0); 
                updateTurnCounterValue(1); 

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


                const availableSlots = Array.from(deckBackSlots.querySelectorAll('.card-slot'));
                
                let slotIndex = 0;
                for (let i = 0; i < cardThumbnails.length; i++) {
                    if (availableSlots[slotIndex]) {
                        availableSlots[slotIndex].appendChild(cardThumbnails[i]);
                        resetSlotToDefault(availableSlots[slotIndex]); 
                        slotIndex++;
                    }
                }
                
                arrangeSlots(deckBackSlotsId); 
                
                const allDeckSlots = Array.from(deckBackSlots.querySelectorAll('.card-slot'));
                let currentDeckThumbnails = [];
                
                allDeckSlots.forEach(slot => {
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
                syncMainZoneImage('side-deck'); 

                isDecorationMode = false;
                if (decorationModeBtn) {
                    decorationModeBtn.textContent = '装飾モード';
                    decorationModeBtn.style.backgroundColor = '#ffcc00'; 
                    decorationModeBtn.style.boxShadow = '0 3px #997a00';
                }

                if (smToggleBtn) {
                    const sadistClass = (idPrefix === 'opponent-') ? 'opponent-sadist-mode' : 'player-sadist-mode';
                    wrapperElement.classList.remove(sadistClass); 

                    if (idPrefix === 'opponent-') {
                        smToggleBtn.dataset.mode = 'sadist';
                        smToggleBtn.textContent = 'サディスト';
                        wrapperElement.classList.add(sadistClass); 
                    } else {
                        smToggleBtn.dataset.mode = 'masochist';
                        smToggleBtn.textContent = 'マゾヒスト';
                    }
                }
                
                const decorationClass = (idPrefix === 'opponent-') ? 'opponent-decoration-mode-active' : 'player-decoration-mode-active';
                document.body.classList.remove(decorationClass);
                
                toggleSidebarContent(deckBackSlotsId); 
            });
        }

        const flipBoardButton = document.getElementById(idPrefix + 'flip-board-btn');
        if (flipBoardButton) {
            flipBoardButton.addEventListener('click', () => {
                document.body.classList.toggle('board-flipped');
            });
        }

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

        
        const diceRollBtn = document.getElementById(idPrefix + 'dice-roll-btn');
        const coinTossBtn = document.getElementById(idPrefix + 'coin-toss-btn');
        const randomResultDisplay = document.getElementById(idPrefix + 'random-result');

        if (diceRollBtn && coinTossBtn && randomResultDisplay) {
            
            diceRollBtn.addEventListener('click', () => {
                const result = Math.floor(Math.random() * 6) + 1;
                randomResultDisplay.textContent = `ダイス: ${result}`;
            });

            coinTossBtn.addEventListener('click', () => {
                const result = Math.random() < 0.5 ? 'ウラ' : 'オモテ';
                randomResultDisplay.textContent = `コイン: ${result}`;
            });
        }
        
        cardSlots.forEach(addSlotEventListeners);
        
        const deckSlot = document.getElementById(idPrefix + 'deck')?.querySelector('.card-slot');
        const sideDeckSlot = document.getElementById(idPrefix + 'side-deck')?.querySelector('.card-slot');

        if (deckSlot) {
            createCardThumbnail('./decoration/デッキ.png', deckSlot, true); 
        }
        if (sideDeckSlot) {
            createCardThumbnail('./decoration/EXデッキ.png', sideDeckSlot, true);
        }
        
        syncMainZoneImage('deck');
        syncMainZoneImage('grave');
        syncMainZoneImage('exclude');
        syncMainZoneImage('side-deck');

        
        const exportButton = document.getElementById(idPrefix + 'export-deck-btn');
        const importButton = document.getElementById(idPrefix + 'import-deck-btn');

        function extractCardDataFromContainer(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return null;
            
            const baseId = getBaseId(containerId);
            let slotsContainer;
            if (baseId === 'free-space-slots') {
                slotsContainer = container.querySelector('.free-space-slot-container');
            } else if (baseId === 'deck' || baseId === 'side-deck' || baseId === 'grave' || baseId === 'exclude') {
                slotsContainer = container.querySelector('.slot-container');
            } else {
                slotsContainer = container.querySelector('.deck-back-slot-container');
            }
            
            if (!slotsContainer) return null;

            const slots = slotsContainer.querySelectorAll('.card-slot');
            const zoneData = Array.from(slots).map(slot => {
                const thumbnails = slot.querySelectorAll('.thumbnail');
                if (thumbnails.length === 0) {
                    return null; 
                }
                
                const cardsInSlot = Array.from(thumbnails).map(thumb => {
                    const img = thumb.querySelector('.card-image');
                    const isFlipped = thumb.dataset.isFlipped === 'true';
                    const originalSrc = thumb.dataset.originalSrc || null;
                    let src;

                    if (isFlipped) {
                        src = img.src; 
                    } else {
                        src = img.src; 
                    }

                    const counterOverlay = thumb.querySelector('.card-counter-overlay');
                    const counter = counterOverlay ? (parseInt(counterOverlay.dataset.counter) || 0) : 0;
                    const memo = thumb.dataset.memo || ''; 

                    return {
                        src: src,
                        isDecoration: thumb.dataset.isDecoration === 'true',
                        isFlipped: isFlipped,
                        originalSrc: originalSrc, 
                        counter: counter,
                        memo: memo 
                    };
                });
                
                return cardsInSlot;
            });
            
            return zoneData;
        }

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
                if (!slot) return; 

                if (cardsInSlot && Array.isArray(cardsInSlot)) {
                    cardsInSlot.forEach(cardData => {
                        createCardThumbnail(cardData, slot, false);
                    });
                }
            });
        }


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

                    if (exportData.decorations.deck) exportData.decorations.deck = exportData.decorations.deck[0] || null;
                    if (exportData.decorations.sideDeck) exportData.decorations.sideDeck = exportData.decorations.sideDeck[0] || null;
                    if (exportData.decorations.grave) exportData.decorations.grave = exportData.decorations.grave[0] || null;
                    if (exportData.decorations.exclude) exportData.decorations.exclude = exportData.decorations.exclude[0] || null;

                    Object.keys(exportData.decorations).forEach(key => {
                        const decorationSlotData = exportData.decorations[key]; 
                        if (decorationSlotData && Array.isArray(decorationSlotData)) {
                            const filteredData = decorationSlotData.filter(card => card.isDecoration === true);
                            if (filteredData.length > 0) {
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
                    console.warn("デッキのエクスポートに失敗しました。");
                }
            });
        }

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

                            clearContainerData(idPrefix + 'deck-back-slots', false);
                            clearContainerData(idPrefix + 'side-deck-back-slots', false);
                            clearContainerData(idPrefix + 'free-space-slots', false);
                            clearContainerData(idPrefix + 'deck', false);
                            clearContainerData(idPrefix + 'side-deck', false);
                            clearContainerData(idPrefix + 'grave', false);
                            clearContainerData(idPrefix + 'exclude', false);
                            
                            if (importData.decorations) {
                                if (importData.decorations.deck !== undefined) clearContainerData(idPrefix + 'deck', true);
                                if (importData.decorations.sideDeck !== undefined) clearContainerData(idPrefix + 'side-deck', true);
                                if (importData.decorations.grave !== undefined) clearContainerData(idPrefix + 'grave', true);
                                if (importData.decorations.exclude !== undefined) clearContainerData(idPrefix + 'exclude', true);
                            }

                            applyCardDataToContainer(idPrefix + 'deck-back-slots', importData.deck);
                            applyCardDataToContainer(idPrefix + 'side-deck-back-slots', importData.sideDeck);
                            applyCardDataToContainer(idPrefix + 'free-space-slots', importData.freeSpace);
                            
                            if (importData.decorations) {
                                if (importData.decorations.deck) applyCardDataToContainer(idPrefix + 'deck', [importData.decorations.deck]);
                                if (importData.decorations.sideDeck) applyCardDataToContainer(idPrefix + 'side-deck', [importData.decorations.sideDeck]);
                                if (importData.decorations.grave) applyCardDataToContainer(idPrefix + 'grave', [importData.decorations.grave]);
                                if (importData.decorations.exclude) applyCardDataToContainer(idPrefix + 'exclude', [importData.decorations.exclude]);
                            }

                            arrangeSlots(idPrefix + 'deck-back-slots');
                            arrangeSlots(idPrefix + 'side-deck-back-slots');
                            
                            syncMainZoneImage('deck');
                            syncMainZoneImage('grave');
                            syncMainZoneImage('exclude');
                            syncMainZoneImage('side-deck');

                        } catch (error) {
                            console.error("インポートに失敗しました:", error);
                            console.warn("デッキのインポートに失敗しました。無効なファイル形式の可能性があります。");
                        }
                    };
                    reader.readAsText(file);
                });
                
                fileInput.click();
            });
        }
        
        toggleSidebarContent(deckBackSlotsId); 
        
        if (smToggleBtn) {
            const sadistClass = (idPrefix === 'opponent-') ? 'opponent-sadist-mode' : 'player-sadist-mode';
            if (smToggleBtn.dataset.mode === 'sadist') {
                wrapperElement.classList.add(sadistClass);
            } else {
                wrapperElement.classList.remove(sadistClass);
            }
        }
        
    } 

    
    initializeBoard('.player-wrapper', '');
    
    initializeBoard('.opponent-wrapper', 'opponent-');

});