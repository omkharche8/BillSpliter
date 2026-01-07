document.addEventListener('DOMContentLoaded', () => {
    // --- Element Cache ---
    const elements = {
        scanBtn: document.getElementById('scan-btn'), uploadBtn: document.getElementById('upload-btn'),
        billUploadInput: document.getElementById('bill-upload'), cameraWrapper: document.getElementById('camera-wrapper'),
        billCameraInput: document.getElementById('bill-camera'),
        cameraPreview: document.getElementById('camera-preview'), captureBtn: document.getElementById('capture-btn'),
        scanOverlay: document.getElementById('scan-overlay'), progressContainer: document.getElementById('progress-container'),
        peopleCount: document.getElementById('people-count'), incrementPeopleBtn: document.getElementById('increment-people'),
        decrementPeopleBtn: document.getElementById('decrement-people'), peopleNamesContainer: document.getElementById('people-names-container'),
        peopleNextBtn: document.getElementById('people-next-btn'), cardStack: document.getElementById('card-stack'),
        cardProgress: document.getElementById('card-progress'), receiptContainer: document.getElementById('receipt-container'),
        shareBtn: document.getElementById('share-btn'), doneBtn: document.getElementById('done-btn'),
        messageBox: document.getElementById('message-box'), confettiCanvas: document.getElementById('confetti-canvas'),
        detailsModal: document.getElementById('details-modal'), modalTitle: document.getElementById('modal-title'),
        modalItems: document.getElementById('modal-items'), modalSummary: document.getElementById('modal-summary'),
        modalCloseBtn: document.getElementById('modal-close-btn'), payToModal: document.getElementById('pay-to-modal'),
        payToInput: document.getElementById('pay-to-input'), generateShareBtn: document.getElementById('generate-share-btn'),
        splitItemModal: document.getElementById('split-item-modal'), splitItemInfo: document.getElementById('split-item-info'),
        splitPeopleList: document.getElementById('split-people-list'), confirmSplitBtn: document.getElementById('confirm-split-btn'),
        undoBtn: document.getElementById('undo-btn'), skipItemBtn: document.getElementById('skip-item-btn'),
        dishesScreenControls: document.getElementById('dishes-screen-controls'), shareFallbackModal: document.getElementById('share-fallback-modal'),
        shareFallbackText: document.getElementById('share-fallback-text'), copyFallbackBtn: document.getElementById('copy-fallback-btn'),
        analyzingEmoji: document.getElementById('analyzing-emoji'), funnyQuote: document.getElementById('funny-quote'),
        editBillBtn: document.getElementById('edit-bill-btn'), editBillModal: document.getElementById('edit-bill-modal'),
        editBillItemsContainer: document.getElementById('edit-bill-items-container'), addItemBtn: document.getElementById('add-item-btn'),
        editSubtotal: document.getElementById('edit-subtotal'), editTax: document.getElementById('edit-tax'),
        editServiceCharge: document.getElementById('edit-service-charge'), editDiscounts: document.getElementById('edit-discounts'),
        editTotal: document.getElementById('edit-total'), cancelEditBtn: document.getElementById('cancel-edit-btn'),
        saveEditBtn: document.getElementById('save-edit-btn'),
        billReviewContainer: document.getElementById('bill-review-container'),
        reviewEditBtn: document.getElementById('review-edit-btn'),
        reviewNextBtn: document.getElementById('review-next-btn'),
        reviewScanAgainBtn: document.getElementById('review-scan-again-btn'),
        howItWorksBtn: document.getElementById('how-it-works-btn'),
        howItWorksModal: document.getElementById('how-it-works-modal'),
        howItWorksCloseBtn: document.getElementById('how-it-works-close-btn'),
    };

    // --- Utility Functions ---
    const toDecimal = (value) => {
        try {
            if (value === null || value === undefined || value === '') {
                return new Decimal(0);
            }

            let sanitizedValue = String(value).replace(/[^0-9.-]+/g, "");

            if (sanitizedValue === '' || sanitizedValue === '.' || sanitizedValue === '-') {
                return new Decimal(0);
            }

            return new Decimal(sanitizedValue);
        } catch (e) {
            console.warn(`Could not convert value "${value}" to Decimal. Returning 0.`, e);
            return new Decimal(0);
        }
    };

    // --- State Management ---
    const getInitialState = () => ({
        currentScreen: 'camera-screen', people: [], billItems: [], assignments: {}, skippedItems: [],
        taxAndTotals: { subtotal: 0, tax: 0, service_charge: 0, discounts: 0, total: 0 },
        cameraStream: null, currentItemIndex: 0, history: [], quoteInterval: null, originalBillData: null,
    });
    let state = getInitialState();

    // --- Initialization ---
    function init() {
        state = getInitialState();
        setupEventListeners();
        updatePeopleInputs();
    }

    function setupEventListeners() {
        elements.scanBtn.addEventListener('click', openNativeCamera);
        elements.captureBtn.addEventListener('click', captureAndProcess);
        elements.uploadBtn.addEventListener('click', () => elements.billUploadInput.click());
        elements.billUploadInput.addEventListener('change', handleFileUpload);
        if (elements.billCameraInput) {
            elements.billCameraInput.addEventListener('change', handleFileUpload);
        }
        elements.incrementPeopleBtn.addEventListener('click', () => updatePeopleCount(1));
        elements.decrementPeopleBtn.addEventListener('click', () => updatePeopleCount(-1));
        elements.peopleNextBtn.addEventListener('click', validateAndProceedToDishes);
        elements.doneBtn.addEventListener('click', resetApp);
        elements.shareBtn.addEventListener('click', showPayToModal);
        elements.modalCloseBtn.addEventListener('click', hideDetailsModal);
        elements.detailsModal.addEventListener('click', (e) => { if (e.target === elements.detailsModal) hideDetailsModal() });
        elements.generateShareBtn.addEventListener('click', handleGenerateAndShare);
        elements.payToModal.addEventListener('click', (e) => { if (e.target === elements.payToModal) hidePayToModal() });
        elements.confirmSplitBtn.addEventListener('click', handleSplitConfirm);
        elements.splitItemModal.addEventListener('click', (e) => { if (e.target === elements.splitItemModal) hideSplitItemModal() });
        elements.undoBtn.addEventListener('click', undoLastAction);
        elements.skipItemBtn.addEventListener('click', skipItem);
        elements.copyFallbackBtn.addEventListener('click', handleFallbackCopy);
        elements.shareFallbackModal.addEventListener('click', (e) => { if (e.target === elements.shareFallbackModal) hideShareFallbackModal() });
        elements.reviewEditBtn.addEventListener('click', showEditBillModal);
        elements.reviewNextBtn.addEventListener('click', () => switchToScreen('people-screen'));
        elements.editBillBtn.addEventListener('click', showEditBillModal);
        elements.cancelEditBtn.addEventListener('click', hideEditBillModal);
        elements.addItemBtn.addEventListener('click', () => addEditableItemRow());
        elements.saveEditBtn.addEventListener('click', handleSaveChanges);
        elements.howItWorksBtn.addEventListener('click', showHowItWorksModal);
        elements.howItWorksCloseBtn.addEventListener('click', hideHowItWorksModal);
        elements.howItWorksModal.addEventListener('click', (e) => { if (e.target === elements.howItWorksModal) hideHowItWorksModal(); });
        elements.reviewScanAgainBtn.addEventListener('click', resetToStart);
        elements.editTax.addEventListener('input', updateEditModalTotals);
        elements.editServiceCharge.addEventListener('input', updateEditModalTotals);
        elements.editDiscounts.addEventListener('input', () => { sanitizeDiscountInput(); updateEditModalTotals(); });
        const discountType = document.getElementById('edit-discount-type');
        if (discountType) discountType.addEventListener('change', updateEditModalTotals);
    }
    function openNativeCamera() {
        const input = elements.billCameraInput;
        if (input) {
            // Clear previous selection so the same photo can be re-chosen if needed
            input.value = '';
            input.click();
        } else {
            // Fallback to in-app camera preview
            startCamera();
        }
    }


    // --- Core App Flow ---
    function switchToScreen(newScreenId) {
        const oldScreen = document.querySelector('.screen.active');
        const newScreen = document.getElementById(newScreenId);
        if (oldScreen) oldScreen.classList.remove('active');
        if (newScreen) newScreen.classList.add('active');
        state.currentScreen = newScreenId;
        if (newScreenId !== 'camera-screen' && state.cameraStream) stopCamera();
    }

    async function processImageWithGemini(imageSrc) {
        elements.progressContainer.classList.remove('hidden');
        elements.scanOverlay.classList.add('hidden');
        startAnalyzingAnimation();

        try {
            const base64ImageData = imageSrc.split(',')[1];
            let result;

            // Try serverless proxy first (for Vercel deployment)
            try {
                const response = await fetch('/api/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64ImageData })
                });
                if (!response.ok) throw new Error(`API call failed: ${response.status}`);
                result = await response.json();
            } catch (serverError) {
                // Fallback to direct API call (for local development)
                console.log('Server endpoint not available, using direct API call...');
                const apiKey = window.GEMINI_API_KEY;
                if (!apiKey) {
                    throw new Error('API key not found. Please set window.GEMINI_API_KEY in env.js');
                }

                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
                const payload = {
                    contents: [{
                        parts: [
                            { text: "You are a precise data extraction engine. Your only job is to extract information from the receipt image. For each distinct line item, you MUST extract the following three fields from their corresponding columns: 1. `name`: The text from the 'Item Name' column. 2. `rate`: The numerical value from the 'Rate' column (price for a single unit). 3. `price`: The numerical value from the 'Amount' column (the total price for that line). CRITICAL INSTRUCTIONS: - Do NOT extract the 'Qty' column. - Do NOT aggregate items. Create a separate JSON object for each line. - The fields `name`, `rate`, and `price` are all mandatory for every item. Also extract the overall `summary` containing `subtotal`, `tax`, `service_charge`, `discounts`, and `total`. Provide clean JSON." },
                            { inlineData: { mimeType: 'image/jpeg', data: base64ImageData } }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: 'OBJECT',
                            properties: {
                                items: {
                                    type: 'ARRAY',
                                    items: {
                                        type: 'OBJECT',
                                        properties: {
                                            name: { type: 'STRING' },
                                            rate: { type: 'NUMBER' },
                                            price: { type: 'NUMBER' }
                                        },
                                        required: ['name', 'rate', 'price']
                                    }
                                },
                                summary: {
                                    type: 'OBJECT',
                                    properties: {
                                        subtotal: { type: 'NUMBER' },
                                        tax: { type: 'NUMBER' },
                                        service_charge: { type: 'NUMBER' },
                                        discounts: { type: 'NUMBER' },
                                        total: { type: 'NUMBER' }
                                    },
                                    required: ['subtotal', 'tax', 'total']
                                }
                            }
                        }
                    }
                };

                const directResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!directResponse.ok) {
                    const errorText = await directResponse.text();
                    throw new Error(`Direct API call failed: ${directResponse.status} - ${errorText}`);
                }

                result = await directResponse.json();
            }

            const jsonString = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (jsonString) {
                parseGeminiResponse(jsonString);
            } else {
                throw new Error("Invalid API response.");
            }
        } catch (error) {
            console.error('Error analyzing bill:', error);
            showMessage('Failed to analyze the bill.', 'error');
            resetToStart();
        } finally {
            stopAnalyzingAnimation();
            elements.progressContainer.classList.add('hidden');
        }
    }

    function parseGeminiResponse(jsonString) {
        try {
            const cleanedString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanedString);
            if (!data.items || data.items.length === 0 || !data.summary) {
                showMessage('AI could not find items on the bill.', 'error');
                resetToStart();
                return;
            }

            verifySubtotal(data);

            state.billItems = [];
            let itemCounter = 0;
            data.items.forEach(item => {
                const rate = toDecimal(item.rate);
                const price = toDecimal(item.price);

                if (rate.isZero() || rate.isNegative() || price.isNegative()) {
                    console.warn(`Skipping invalid item detected by math engine: ${item.name}`);
                    return;
                }

                const calculatedQuantity = price.div(rate).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
                const quantity = calculatedQuantity.isZero() ? new Decimal(1) : calculatedQuantity;
                const pricePerItem = price.div(quantity);

                for (let i = 0; i < quantity.toNumber(); i++) {
                    state.billItems.push({
                        id: `item-${itemCounter++}`,
                        name: item.name,
                        price: pricePerItem.toNumber(),
                        quantityIndex: i + 1,
                        totalQuantity: quantity.toNumber()
                    });
                }
            });

            const s = data.summary || {};
            state.taxAndTotals = {
                subtotal: toDecimal(s.subtotal).toNumber(),
                tax: toDecimal(s.tax).toNumber(),
                service_charge: toDecimal(s.service_charge).toNumber(),
                discounts: Math.abs(toDecimal(s.discounts).toNumber()),
                total: toDecimal(s.total).toNumber()
            };
            state.originalBillData = JSON.parse(JSON.stringify({ billItems: state.billItems, taxAndTotals: state.taxAndTotals }));
            renderBillForReview();
            switchToScreen('bill-review-screen');
        } catch (error) {
            console.error("Error parsing Gemini response:", error, "Raw string:", jsonString);
            showMessage('AI could not understand the bill.', 'error');
            resetToStart();
        }
    }

    function verifySubtotal(data) {
        const itemsTotal = data.items.reduce((sum, item) => sum.plus(toDecimal(item.price)), new Decimal(0));
        const summarySubtotal = toDecimal(data.summary.subtotal);
        const discrepancy = itemsTotal.minus(summarySubtotal).abs();

        if (discrepancy.greaterThan(0.01)) {
            console.warn(`Potential AI calculation error. Items total: ${itemsTotal}, Subtotal: ${summarySubtotal}`);
            setTimeout(() => {
                showMessage('AI math looks fishy! Please review the bill carefully.', 'error');
            }, 500);
        }
    }

    function renderBillForReview() {
        const { taxAndTotals } = state;
        let reviewHTML = `<div class="receipt-header"><h3>Scanned Bill</h3></div>`;

        const consolidatedItems = state.billItems.reduce((acc, item) => {
            if (acc[item.name]) {
                acc[item.name].count += 1;
                acc[item.name].price += item.price;
            } else {
                acc[item.name] = {
                    name: item.name,
                    price: item.price,
                    count: 1
                };
            }
            return acc;
        }, {});

        Object.values(consolidatedItems).forEach(item => {
            reviewHTML += `<div class="receipt-total-line"><span>${item.count} x ${item.name}</span><span>₹${item.price.toFixed(2)}</span></div>`;
        });

        reviewHTML += `<div class="receipt-divider"></div>`;
        reviewHTML += `<div class="receipt-total-line"><span>Subtotal:</span> <span>₹${taxAndTotals.subtotal.toFixed(2)}</span></div>`;
        if (taxAndTotals.tax > 0) reviewHTML += `<div class="receipt-total-line"><span>Total Tax:</span> <span>₹${taxAndTotals.tax.toFixed(2)}</span></div>`;
        if (taxAndTotals.service_charge > 0) reviewHTML += `<div class="receipt-total-line"><span>Service Charge:</span> <span>₹${taxAndTotals.service_charge.toFixed(2)}</span></div>`;
        const dVal = Math.abs(toDecimal(taxAndTotals.discounts).toNumber());
        reviewHTML += `<div class="receipt-total-line"><span>Discounts:</span> <span>-₹${dVal.toFixed(2)}</span></div>`;
        reviewHTML += `<div class="receipt-divider"></div>`;
        reviewHTML += `<div class="receipt-total-line receipt-grand-total"><span>Grand Total:</span> <span>₹${taxAndTotals.total.toFixed(2)}</span></div>`;
        elements.billReviewContainer.innerHTML = reviewHTML;
    }

    // --- Edit Bill Modal Logic ---
    function showEditBillModal() {
        elements.editBillItemsContainer.innerHTML = '';
        const itemsToEdit = JSON.parse(JSON.stringify(state.originalBillData.billItems));

        const consolidatedItems = itemsToEdit.reduce((acc, item) => {
            if (!acc[item.name]) {
                acc[item.name] = {
                    name: item.name,
                    totalQuantity: 0,
                    price: new Decimal(0)
                };
            }
            acc[item.name].totalQuantity += 1;
            acc[item.name].price = acc[item.name].price.plus(toDecimal(item.price));
            return acc;
        }, {});

        Object.values(consolidatedItems).forEach(item => {
            addEditableItemRow({ ...item, price: item.price.toNumber() });
        });

        const summary = state.originalBillData.taxAndTotals;
        elements.editSubtotal.value = summary.subtotal.toFixed(2) || 0;
        elements.editTax.value = summary.tax.toFixed(2) || 0;
        elements.editServiceCharge.value = summary.service_charge.toFixed(2) || 0;
        elements.editDiscounts.value = summary.discounts.toFixed(2) || 0;
        elements.editTotal.value = summary.total.toFixed(2) || 0;

        updateEditModalTotals();
        elements.editBillModal.classList.add('show');
    }

    function hideEditBillModal() {
        elements.editBillModal.classList.remove('show');
    }

    function addEditableItemRow(item = { name: '', totalQuantity: 1, price: 0 }) {
        const row = document.createElement('div');
        row.className = 'edit-item-row';
        row.innerHTML = `
            <input type="text" class="edit-item-name" placeholder="Item Name" value="${item.name}">
            <input type="number" class="edit-item-qty" placeholder="Qty" value="${item.totalQuantity}">
            <input type="number" class="edit-item-price" placeholder="Price" value="${item.price.toFixed(2)}" step="0.01">
            <button class="btn icon-btn" onclick="this.parentElement.remove(); updateEditModalTotals();"><i class="fa-solid fa-trash"></i></button>
        `;
        // Persist a baseline unit price for this row
        const baselineUnitPrice = (item.totalQuantity && item.totalQuantity > 0)
            ? toDecimal(item.price).div(item.totalQuantity)
            : toDecimal(item.price);
        row.dataset.unitPrice = baselineUnitPrice.toString();

        elements.editBillItemsContainer.appendChild(row);
        const qtyInput = row.querySelector('.edit-item-qty');
        const priceInput = row.querySelector('.edit-item-price');
        const nameInput = row.querySelector('.edit-item-name');

        const onAnyChange = () => updateEditModalTotals();

        // Quantity input: allow clear, enforce digits only and max 2 digits, compute total = unitPrice * qty
        qtyInput.addEventListener('input', () => {
            let raw = (qtyInput.value || '').toString().replace(/\D/g, '');
            if (raw.length > 2) raw = raw.slice(0, 2);
            if (raw === '') {
                qtyInput.value = '';
                priceInput.value = '';
                updateEditModalTotals();
                return;
            }
            let qty = parseInt(raw, 10);
            if (isNaN(qty) || qty < 0) qty = 0;
            if (qty > 99) qty = 99;
            qtyInput.value = String(qty);

            const unitPrice = toDecimal(row.dataset.unitPrice || 0);
            const newTotal = unitPrice.times(qty).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
            priceInput.value = newTotal.toFixed(2);
            updateEditModalTotals();
        });

        // When price changes, if qty > 0, update unit price baseline
        priceInput.addEventListener('input', () => {
            const qtyRaw = (qtyInput.value || '').toString().replace(/\D/g, '');
            const qty = qtyRaw === '' ? 0 : Math.min(99, Math.max(0, parseInt(qtyRaw, 10)));
            if (qty > 0) {
                const price = toDecimal(priceInput.value);
                const newUnit = price.div(qty);
                row.dataset.unitPrice = newUnit.toString();
            }
            updateEditModalTotals();
        });

        nameInput.addEventListener('input', onAnyChange);
    }

    function updateEditModalTotals() {
        let subtotal = new Decimal(0);
        const itemRows = elements.editBillItemsContainer.querySelectorAll('.edit-item-row');
        itemRows.forEach(row => {
            const price = toDecimal(row.querySelector('.edit-item-price').value);
            subtotal = subtotal.plus(price);
        });
        elements.editSubtotal.value = subtotal.toFixed(2);

        const tax = toDecimal(elements.editTax.value);
        const service = toDecimal(elements.editServiceCharge.value);
        const discountRaw = toDecimal(elements.editDiscounts.value);
        const discountTypeEl = document.getElementById('edit-discount-type');
        const isPercent = discountTypeEl && discountTypeEl.value === 'percent';
        const discounts = isPercent ? subtotal.times(discountRaw).div(100) : discountRaw;
        elements.editTotal.value = subtotal.plus(tax).plus(service).minus(discounts).toFixed(2);
        const discountAppliedEl = document.getElementById('edit-discount-applied');
        if (discountAppliedEl) {
            const applied = discounts.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
            discountAppliedEl.textContent = `-₹${applied.toFixed(2)}`;
        }
    }

    function sanitizeDiscountInput() {
        if (!elements.editDiscounts) return;
        let raw = (elements.editDiscounts.value || '').toString();
        raw = raw.replace(/[^0-9.]/g, '');
        const parts = raw.split('.');
        if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
        elements.editDiscounts.value = raw;
    }

    function handleSaveChanges() {
        const wasOnResultsScreen = state.currentScreen === 'results-screen';
        const editedItems = [];
        let itemCounter = 0;
        const itemRows = elements.editBillItemsContainer.querySelectorAll('.edit-item-row');

        itemRows.forEach(row => {
            const name = row.querySelector('.edit-item-name').value.trim();
            const qtyRaw = (row.querySelector('.edit-item-qty').value || '').toString().replace(/\D/g, '');
            const quantity = qtyRaw === '' ? 0 : Math.min(99, Math.max(0, parseInt(qtyRaw, 10)));
            const price = toDecimal(row.querySelector('.edit-item-price').value);

            if (!name) return;
            if (quantity <= 0) return; // skip rows with 0/blank quantity
            if (!price.greaterThan(0)) return;

            const pricePerItem = price.div(quantity);
            for (let i = 0; i < quantity; i++) {
                editedItems.push({
                    id: `item-${itemCounter++}`, name, price: pricePerItem.toNumber(),
                    quantityIndex: i + 1, totalQuantity: quantity
                });
            }
        });

        state.billItems = editedItems;
        const discountRawForSave = toDecimal(elements.editDiscounts.value);
        const discountTypeEl2 = document.getElementById('edit-discount-type');
        const isPercentSave = discountTypeEl2 && discountTypeEl2.value === 'percent';
        const discountAbsAmount = isPercentSave ? toDecimal(elements.editSubtotal.value).times(discountRawForSave).div(100) : discountRawForSave;
        state.taxAndTotals = {
            subtotal: toDecimal(elements.editSubtotal.value).toNumber(),
            tax: toDecimal(elements.editTax.value).toNumber(),
            service_charge: toDecimal(elements.editServiceCharge.value).toNumber(),
            discounts: Math.abs(discountAbsAmount.toNumber()),
            total: toDecimal(elements.editTotal.value).toNumber(),
        };

        state.originalBillData = JSON.parse(JSON.stringify({ billItems: state.billItems, taxAndTotals: state.taxAndTotals }));

        hideEditBillModal();

        if (wasOnResultsScreen) {
            showMessage('Bill updated! Please re-assign items.', 'success');
            setupDishesScreen(state.people.map(p => p.name));
        } else {
            showMessage('Bill updated!', 'success');
            renderBillForReview();
        }
    }

    // --- Updated Math Engine ---
    function getReconciledTotals() {
        const totalCharges = toDecimal(state.taxAndTotals.tax)
            .plus(toDecimal(state.taxAndTotals.service_charge))
            .minus(toDecimal(state.taxAndTotals.discounts));

        const diners = state.people.filter(person => state.assignments[person.id] && state.assignments[person.id].length > 0);

        let assignedSubtotal = new Decimal(0);
        Object.values(state.assignments).forEach(assignedItems => {
            assignedItems.forEach(item => {
                assignedSubtotal = assignedSubtotal.plus(toDecimal(item.price));
            });
        });

        const billSubtotal = toDecimal(state.taxAndTotals.subtotal).isZero() ? assignedSubtotal : toDecimal(state.taxAndTotals.subtotal);
        const chargeRatio = billSubtotal.greaterThan(0) ? totalCharges.div(billSubtotal) : new Decimal(0);

        let calculatedGrandTotal = new Decimal(0);

        const personTotals = state.people.map(person => {
            const items = state.assignments[person.id] || [];
            const subtotal = items.reduce((sum, item) => sum.plus(toDecimal(item.price)), new Decimal(0));

            const isDiner = diners.some(d => d.id === person.id);
            const chargesShare = isDiner ? subtotal.times(chargeRatio) : new Decimal(0);

            const total = subtotal.plus(chargesShare);
            calculatedGrandTotal = calculatedGrandTotal.plus(total);

            return { person, total, subtotal, chargesShare, isDiner };
        });

        const finalGrandTotal = personTotals.reduce((sum, p) => sum.plus(p.total), new Decimal(0));
        const discrepancy = assignedSubtotal.plus(totalCharges).minus(finalGrandTotal);

        if (diners.length > 0 && discrepancy.abs().greaterThan(0.01)) {
            const lastDiner = personTotals.find(p => p.isDiner);
            if (lastDiner) lastDiner.total = lastDiner.total.plus(discrepancy);
        }

        return { personTotals: personTotals.map(p => ({ ...p, total: p.total.toNumber(), subtotal: p.subtotal.toNumber(), chargesShare: p.chargesShare.toNumber() })), finalGrandTotal: finalGrandTotal.plus(discrepancy).toNumber() };
    }

    function renderReceipt() {
        const { personTotals, finalGrandTotal } = getReconciledTotals();
        let receiptHTML = `<div class="receipt-header"><h3>BillSplitr Summary</h3><p>${new Date().toLocaleString()}</p></div>`;

        personTotals.forEach(p => {
            receiptHTML += `<div class="receipt-person-section" data-person-id="${p.person.id}"><div class="receipt-person-header"><span>${p.person.name}</span><span>₹${p.total.toFixed(2)}</span></div></div>`;
        });

        if (state.skippedItems.length > 0) {
            receiptHTML += `<div class="receipt-divider"></div><div class="receipt-skipped-section"><h4>Skipped Items</h4>`;
            state.skippedItems.forEach(item => {
                receiptHTML += `<div class="receipt-total-line receipt-skipped-item"><span>${item.name}</span><span>₹${item.price.toFixed(2)}</span></div>`;
            });
            receiptHTML += `</div>`;
        }

        receiptHTML += `<div class="receipt-divider"></div>`;
        const assignedSubtotal = personTotals.reduce((sum, p) => sum + p.subtotal, 0);
        const assignedCharges = personTotals.reduce((sum, p) => sum + p.chargesShare, 0);

        receiptHTML += `<div class="receipt-total-line"><span>Assigned Subtotal:</span> <span>₹${assignedSubtotal.toFixed(2)}</span></div>`;
        receiptHTML += `<div class="receipt-total-line"><span>Applicable Tax/Service:</span> <span>₹${assignedCharges.toFixed(2)}</span></div>`;
        receiptHTML += `<div class="receipt-total-line receipt-grand-total"><span>Grand Total (Paid):</span> <span>₹${finalGrandTotal.toFixed(2)}</span></div>`;
        elements.receiptContainer.innerHTML = receiptHTML;
        document.querySelectorAll('.receipt-person-section').forEach(el => {
            el.addEventListener('click', () => showDetailsModal(el.dataset.personId));
        });
    }

    function showDetailsModal(personId) {
        const person = state.people.find(p => p.id === personId);
        if (!person) return;
        const { personTotals } = getReconciledTotals();
        const personData = personTotals.find(p => p.person.id === personId);
        if (!personData) return;

        const items = state.assignments[personId] || [];
        elements.modalTitle.textContent = `${person.name}'s Details`;
        const itemsHTML = items.length > 0 ? items.map(item => {
            const splitText = item.isSplit ? ` (split 1/${item.splitCount})` : '';
            const itemId = item.originalId || item.id;
            return `<li>
                        <span>${item.name}${splitText}</span>
                        <span>
                            ₹${item.price.toFixed(2)}
                            <button class="btn icon-btn delete-assigned-item-btn" data-item-id="${item.id}" data-person-id="${personId}" title="Un-assign item">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </span>
                    </li>`;
        }).join('') : '<li><span>No items assigned</span><span></span></li>';
        elements.modalItems.innerHTML = itemsHTML;

        elements.modalItems.querySelectorAll('.delete-assigned-item-btn').forEach(btn => {
            btn.addEventListener('click', handleUnassignItem);
        });

        elements.modalSummary.innerHTML = `
            <div class="receipt-total-line"><span>Subtotal:</span> <span>₹${personData.subtotal.toFixed(2)}</span></div>
            <div class="receipt-total-line"><span>Tax/Service Share:</span> <span>₹${personData.chargesShare.toFixed(2)}</span></div>
            <div class="receipt-total-line receipt-grand-total"><span>Total:</span> <span>₹${personData.total.toFixed(2)}</span></div>`;
        elements.detailsModal.classList.add('show');
    }

    function handleUnassignItem(event) {
        const { itemId, personId } = event.currentTarget.dataset;

        const personAssignments = state.assignments[personId];
        if (!personAssignments) return;

        const itemIndex = personAssignments.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;

        const [unassignedItem] = personAssignments.splice(itemIndex, 1);

        state.skippedItems.push(unassignedItem);

        showMessage(`${unassignedItem.name} un-assigned.`, 'success');

        // Re-render the modal content and the main receipt
        showDetailsModal(personId);
        renderReceipt();
    }

    async function shareSummary(recipient) {
        const { personTotals, finalGrandTotal } = getReconciledTotals();
        const T = state.taxAndTotals;
        let summary = '🧾 *BillSplitr Summary* 🧾\n\n';

        personTotals.forEach(pData => {
            if (!pData.isDiner) return;
            const items = state.assignments[pData.person.id] || [];
            summary += `*${pData.person.name} owes ₹${pData.total.toFixed(2)}*\n`;
            items.forEach(item => {
                const splitText = item.isSplit ? ` (split 1/${item.splitCount})` : '';
                summary += `  - ${item.name}${splitText} (₹${item.price.toFixed(2)})\n`;
            });
            summary += `  - Tax/Service Share (₹${pData.chargesShare.toFixed(2)})\n\n`;
        });

        if (state.skippedItems.length > 0) {
            summary += '--------------------------------\n';
            summary += '*Skipped Items (Not Included in Totals)*\n';
            state.skippedItems.forEach(item => {
                summary += `  - ${item.name} (₹${item.price.toFixed(2)})\n`;
            });
            summary += '\n';
        }

        summary += '--------------------------------\n';
        summary += '*Original Bill Breakdown:*\n';
        summary += `Subtotal: ₹${T.subtotal.toFixed(2)}\n`;
        if (T.tax > 0) summary += `Tax: ₹${T.tax.toFixed(2)}\n`;
        if (T.service_charge > 0) summary += `Service: ₹${T.service_charge.toFixed(2)}\n`;
        if (T.discounts > 0) summary += `Discounts: -₹${T.discounts.toFixed(2)}\n`;
        summary += `*Grand Total: ₹${T.total.toFixed(2)}*\n\n`;
        summary += `*Total Paid via App: ₹${finalGrandTotal.toFixed(2)}*\n\n`;
        summary += `💸 *Please pay to: ${recipient}*`;

        try {
            if (!navigator.share) throw new Error('Share API not available.');
            await navigator.share({ title: 'BillSplitr Summary', text: summary });
        } catch (error) {
            try {
                if (!navigator.clipboard) throw new Error('Clipboard API not available.');
                await navigator.clipboard.writeText(summary);
                showMessage('Summary copied to clipboard!', 'success');
            } catch (err) {
                elements.shareFallbackText.value = summary;
                elements.shareFallbackModal.classList.add('show');
            }
        }
    }

    function validateAndProceedToDishes() {
        const nameInputs = elements.peopleNamesContainer.querySelectorAll('.person-name-input');
        const names = Array.from(nameInputs).map(input => input.value.trim());
        if (names.some(name => name === '')) {
            showMessage('Please enter a name for every person.', 'error');
            return;
        }
        const lowerCaseNames = names.map(n => n.toLowerCase());
        const uniqueNames = new Set(lowerCaseNames);
        if (uniqueNames.size !== lowerCaseNames.length) {
            showMessage('Person names must be unique.', 'error');
            return;
        }

        setupDishesScreen(names);
    }
    function setupDishesScreen(names) {
        state.people = names.map((name, index) => ({ id: `person_${index}`, name }));
        state.assignments = {};
        state.people.forEach(p => state.assignments[p.id] = []);
        state.skippedItems = [];
        state.currentItemIndex = 0;
        state.history = [];
        renderAssignmentCards();
        switchToScreen('dishes-screen');
    }
    function handleGenerateAndShare() {
        const recipient = elements.payToInput.value.trim();
        if (!recipient) { showMessage('Please enter who to pay.', 'error'); return; }
        hidePayToModal();
        shareSummary(recipient);
    }
    function captureAndProcess() {
        vibrate(100);
        const vw = elements.cameraPreview.videoWidth;
        const vh = elements.cameraPreview.videoHeight;
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(vw, vh));
        const cw = Math.round(vw * scale);
        const ch = Math.round(vh * scale);
        const c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        c.getContext('2d').drawImage(elements.cameraPreview, 0, 0, cw, ch);
        stopCamera();
        processImageWithGemini(c.toDataURL('image/jpeg', 0.8));
    }

    async function scaleDataUrlIfNeeded(dataUrl, maxDim = 1600, quality = 0.8) {
        try {
            const img = new Image();
            const loaded = new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            img.src = dataUrl;
            await loaded;
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;
            const max = Math.max(width, height);
            if (max <= maxDim) return dataUrl;
            const scale = maxDim / max;
            const targetW = Math.round(width * scale);
            const targetH = Math.round(height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = targetW; canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, targetW, targetH);
            return canvas.toDataURL('image/jpeg', quality);
        } catch {
            return dataUrl;
        }
    }

    function handleFileUpload(e) {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = async (ev) => {
            const raw = typeof ev.target.result === 'string' ? ev.target.result : '';
            if (!raw) { processImageWithGemini(ev.target.result); return; }
            const optimized = await scaleDataUrlIfNeeded(raw, 1600, 0.8);
            processImageWithGemini(optimized);
        };
        r.readAsDataURL(f);
    }
    function updatePeopleCount(c) {
        let n = parseInt(elements.peopleCount.textContent) + c;
        if (n < 2) {
            showMessage('You need at least 2 people to split a bill.', 'error');
            return;
        }
        if (n >= 2 && n <= 10) {
            elements.peopleCount.textContent = n;
            elements.peopleCount.classList.add('animate-scale');
            setTimeout(() => elements.peopleCount.classList.remove('animate-scale'), 300);
            updatePeopleInputs();
        }
        vibrate();
    }
    function updatePeopleInputs() { const c = parseInt(elements.peopleCount.textContent); const existingCount = elements.peopleNamesContainer.children.length; if (c > existingCount) { for (let i = existingCount; i < c; i++) { const input = document.createElement('input'); input.type = 'text'; input.placeholder = `Person ${i + 1} Name`; input.className = 'person-name-input'; input.style.animation = 'fadeIn 0.5s'; elements.peopleNamesContainer.appendChild(input); } } else if (c < existingCount) { for (let i = existingCount; i > c; i--) { const child = elements.peopleNamesContainer.lastElementChild; if (child) { child.style.animation = 'fadeOut 0.5s'; setTimeout(() => child.remove(), 500); } } } }
    function hideDetailsModal() { elements.detailsModal.classList.remove('show'); }
    function showPayToModal() { elements.payToModal.classList.add('show'); }
    function hidePayToModal() { elements.payToModal.classList.remove('show'); }
    function resetApp() { triggerConfetti(); setTimeout(resetToStart, 2000); }
    function resetToStart() { stopCamera(); state = getInitialState(); elements.peopleCount.textContent = '2'; updatePeopleInputs(); elements.scanOverlay.classList.remove('hidden'); switchToScreen('camera-screen'); }
    function showMessage(m, t = 'success') { elements.messageBox.textContent = m; elements.messageBox.className = `message-box ${t} show`; setTimeout(() => elements.messageBox.classList.remove('show'), 3000); }
    async function startCamera() { try { state.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); elements.cameraPreview.srcObject = state.cameraStream; elements.cameraWrapper.classList.remove('hidden'); elements.scanOverlay.classList.add('hidden'); } catch (e) { showMessage('Could not access camera.', 'error'); } }
    function stopCamera() { if (state.cameraStream) { state.cameraStream.getTracks().forEach(t => t.stop()); state.cameraStream = null; elements.cameraWrapper.classList.add('hidden'); elements.scanOverlay.classList.remove('hidden'); } }
    function vibrate(d = 50) { if (navigator.vibrate) navigator.vibrate(d); }
    function triggerConfetti() { const c = elements.confettiCanvas; const ctx = c.getContext('2d'); c.width = window.innerWidth; c.height = window.innerHeight; let conf = []; const num = 200; const colors = ["#98C1D9", "#E07A5F", "#EE9B00", "#588157", "#C14953"]; for (let i = 0; i < num; i++) { conf.push({ x: Math.random() * c.width, y: Math.random() * c.height - c.height, r: Math.random() * 4 + 1, d: Math.random() * num, color: colors[Math.floor(Math.random() * colors.length)], tilt: Math.floor(Math.random() * 10) - 10, tiltAngle: 0, tiltAngleIncrement: Math.random() * 0.07 + 0.05 }); } const draw = () => { ctx.clearRect(0, 0, c.width, c.height); conf.forEach((p, i) => { ctx.beginPath(); ctx.lineWidth = p.r * 2; ctx.strokeStyle = p.color; ctx.moveTo(p.x + p.tilt + p.r, p.y); ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r); ctx.stroke(); p.tiltAngle += p.tiltAngleIncrement; p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2; p.x += Math.sin(p.d); p.tilt = Math.sin(p.tiltAngle) * 15; if (p.y > c.height) conf.splice(i, 1); }); if (conf.length > 0) requestAnimationFrame(draw); else ctx.clearRect(0, 0, c.width, c.height); }; requestAnimationFrame(draw); }
    function handleFallbackCopy() { elements.shareFallbackText.select(); document.execCommand('copy'); hideShareFallbackModal(); showMessage('Summary copied!', 'success'); }
    function hideShareFallbackModal() { elements.shareFallbackModal.classList.remove('show'); }
    const funnyQuotes = [
        "Splitting bills, not friendships.",
        "I'm not saying it's expensive, but the receipt has three commas.",
        "Let's do the math... and hope it's not a horror story.",
        "This is the part where we find out who really ordered the lobster.",
        "Money can't buy happiness, but it can buy pizza, which is close.",
        "Analyzing the financial damage...",
        "Let's hope this receipt doesn't need a therapist.",
        "Who ordered the 'I will just have a water' and then ate half my fries?",
        "Counting every bean. Literally."
    ];
    const analyzingEmojis = ["🧾", "🤔", "🤑", "🤯", "✨", "➗", "🧮", "🤓", "🧐", "💸"];
    function startAnalyzingAnimation() { const u = () => { elements.funnyQuote.textContent = funnyQuotes[Math.floor(Math.random() * funnyQuotes.length)]; elements.analyzingEmoji.textContent = analyzingEmojis[Math.floor(Math.random() * analyzingEmojis.length)]; }; u(); state.quoteInterval = setInterval(() => { elements.funnyQuote.classList.add('fade-out'); setTimeout(() => { u(); elements.funnyQuote.classList.remove('fade-out'); }, 300); }, 3000); }
    function stopAnalyzingAnimation() { clearInterval(state.quoteInterval); state.quoteInterval = null; }

    // --- Item Assignment (Dishes Screen) ---
    function renderAssignmentCards() {
        elements.cardStack.innerHTML = '';
        const { currentItemIndex, billItems } = state;

        if (currentItemIndex >= billItems.length) {
            switchToScreen('results-screen');
            renderReceipt();
            return;
        }

        elements.cardProgress.textContent = `Item ${currentItemIndex + 1} of ${billItems.length}`;

        const currentItem = billItems[currentItemIndex];
        const nextItem = billItems[currentItemIndex + 1];

        if (nextItem) {
            elements.cardStack.appendChild(createItemCard(nextItem, 'bottom'));
        }
        elements.cardStack.appendChild(createItemCard(currentItem, 'top'));
    }

    function createItemCard(item, positionClass) {
        const card = document.createElement('div');
        card.className = `item-card ${positionClass}`;
        card.dataset.itemId = item.id;

        const quantityCue = item.totalQuantity > 1 ? `<p class="item-quantity-cue">(${item.quantityIndex} of ${item.totalQuantity})</p>` : '';

        let assignButtonsHTML = state.people.map(person =>
            `<button class="btn assign-person-btn" data-person-id="${person.id}">${person.name}</button>`
        ).join('');

        card.innerHTML = `
            <div class="item-info">
                <h3 class="item-name">${item.name}</h3>
                ${quantityCue}
                <h2 class="item-price">₹${item.price.toFixed(2)}</h2>
            </div>
            <div class="card-actions">
                <div class="assign-buttons">${assignButtonsHTML}</div>
                <button class="btn split-item-btn"><i class="fa-solid fa-users"></i> Split Item</button>
            </div>
        `;

        card.querySelectorAll('.assign-person-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                vibrate();
                assignItem(e.target.dataset.personId, item);
            });
        });

        card.querySelector('.split-item-btn').addEventListener('click', () => showSplitItemModal(item));

        return card;
    }

    function assignItem(personId, item) {
        const action = { type: 'assign', personId, item: { ...item } };
        state.assignments[personId].push(item);
        advanceToNextItem(action);
    }

    function skipItem() {
        const item = state.billItems[state.currentItemIndex];
        const action = { type: 'skip', item: { ...item } };
        state.skippedItems.push(item);
        advanceToNextItem(action);
    }

    function advanceToNextItem(action) {
        state.history.push(action);
        elements.undoBtn.classList.remove('hidden');

        const topCard = elements.cardStack.querySelector('.top');
        if (topCard) {
            topCard.classList.add('exit');
            topCard.addEventListener('transitionend', () => {
                state.currentItemIndex++;
                renderAssignmentCards();
            }, { once: true });
        } else {
            state.currentItemIndex++;
            renderAssignmentCards();
        }
    }

    function undoLastAction() {
        if (state.history.length === 0) return;
        const lastAction = state.history.pop();

        if (lastAction.type === 'assign') {
            const { personId, item } = lastAction;
            state.assignments[personId] = state.assignments[personId].filter(i => i.id !== item.id);
        } else if (lastAction.type === 'skip') {
            state.skippedItems = state.skippedItems.filter(i => i.id !== lastAction.item.id);
        } else if (lastAction.type === 'split') {
            lastAction.assignments.forEach(a => {
                state.assignments[a.personId] = state.assignments[a.personId].filter(i => i.id !== a.item.id);
            });
        }

        state.currentItemIndex--;
        renderAssignmentCards();

        if (state.history.length === 0) {
            elements.undoBtn.classList.add('hidden');
        }
    }

    function showSplitItemModal(item) {
        elements.splitItemInfo.innerHTML = `
            <h3 class="item-name">${item.name}</h3>
            <h2 class="item-price">₹${item.price.toFixed(2)}</h2>`;

        let peopleListHTML = state.people.map(person => `
            <label class="split-person-label">
                <input type="checkbox" name="split-person" value="${person.id}">
                <span class="custom-checkbox"></span>
                <span>${person.name}</span>
            </label>
        `).join('');
        elements.splitPeopleList.innerHTML = peopleListHTML;
        elements.splitItemModal.dataset.itemId = item.id;
        elements.splitItemModal.classList.add('show');
    }

    function hideSplitItemModal() {
        elements.splitItemModal.classList.remove('show');
    }

    function handleSplitConfirm() {
        const item = state.billItems.find(i => i.id === elements.splitItemModal.dataset.itemId);
        const selectedPeopleIds = Array.from(elements.splitPeopleList.querySelectorAll('input:checked')).map(cb => cb.value);

        if (selectedPeopleIds.length < 2) {
            showMessage('Please select at least 2 people to split.', 'error');
            return;
        }

        const price = toDecimal(item.price);
        const numPeople = selectedPeopleIds.length;
        const pricePerPersonRounded = price.div(numPeople).toDecimalPlaces(2, Decimal.ROUND_DOWN);
        let remainder = price.minus(pricePerPersonRounded.times(numPeople));

        const splitAssignments = [];

        selectedPeopleIds.forEach(personId => {
            let finalPricePerPerson = pricePerPersonRounded;
            if (remainder.greaterThan(0)) {
                finalPricePerPerson = finalPricePerPerson.plus(0.01);
                remainder = remainder.minus(0.01);
            }
            const splitItem = {
                ...item,
                price: finalPricePerPerson.toNumber(),
                isSplit: true,
                splitCount: selectedPeopleIds.length,
                id: `${item.id}-split-${personId}`,
                originalId: item.id
            };
            state.assignments[personId].push(splitItem);
            splitAssignments.push({ personId, item: splitItem });
        });

        const action = { type: 'split', item: { ...item }, assignments: splitAssignments };

        hideSplitItemModal();
        advanceToNextItem(action);
    }

    function showHowItWorksModal() { elements.howItWorksModal.classList.add('show'); }
    function hideHowItWorksModal() { elements.howItWorksModal.classList.remove('show'); }

    init();
});