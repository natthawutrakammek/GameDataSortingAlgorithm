/**
 * Sorting Algorithms Engine & Educational Logic
 * Bubble Sort and Selection Sort rules, step generators, and analysis
 */

const SortingTheory = {
    bubbleSort: {
        name: "Bubble Sort (การเรียงลำดับแบบฟอง)",
        icon: "🫧",
        description: "เปรียบเทียบข้อมูลทีละ 'คู่ที่อยู่ติดกัน' (Adjacent Pairs) จากซ้ายไปขวา หากตัวซ้ายมากกว่าตัวขวาจะทำการสลับที่กัน ค่าที่มากที่สุดจะค่อยๆ 'ลอย' ขึ้นไปอยู่ตำแหน่งขวาสุดในแต่ละรอบ",
        bestCase: "O(n) (กรณีข้อมูลเรียงอยู่แล้ว มี flag เช็ค)",
        averageCase: "O(n²)",
        worstCase: "O(n²) (เมื่อข้อมูลเรียงกลับด้าน)",
        spaceComplexity: "O(1) (In-place)",
        numSwaps: "มาก (Worst: n(n-1)/2 ครั้ง)",
        stability: "Stable (คงที่)",
        keyConcept: "เปรียบเทียบเฉพาะคู่ติดกัน ดันค่าสูงสุดไปขวาสุดทีละตัว"
    },
    selectionSort: {
        name: "Selection Sort (การเรียงลำดับแบบเลือก)",
        icon: "🎯",
        description: "สแกนหา 'ค่าน้อยที่สุด' (Minimum Value) จากส่วนที่ยังไม่ได้เรียง แล้วนำมาสลับกับตำแหน่งแรกของรอบนั้น ทำซ้ำเรื่อยๆ จนครบทุกตำแหน่ง",
        bestCase: "O(n²)",
        averageCase: "O(n²)",
        worstCase: "O(n²)",
        spaceComplexity: "O(1) (In-place)",
        numSwaps: "น้อยมาก (ไม่เกิน n-1 ครั้งเสมอ!)",
        stability: "Unstable (โดยทั่วไป)",
        keyConcept: "ค้นหาค่าน้อยที่สุดในรอบ แล้วสลับมาวางข้างหน้า"
    }
};

class AlgorithmState {
    constructor(array, algorithmType) {
        this.original = [...array];
        this.array = [...array];
        this.type = algorithmType; // 'bubble' or 'selection'
        this.n = array.length;

        // Common tracking
        this.comparisons = 0;
        this.swaps = 0;
        this.errors = 0;
        this.isFinished = false;

        // Specific pointers
        if (this.type === 'bubble') {
            this.i = 0; // pass index (0 to n-2)
            this.j = 0; // current comparison index (j and j+1)
            this.swappedThisPass = false;
            this.lockedIndices = new Set();
        } else if (this.type === 'selection') {
            this.i = 0; // target position to fill with minimum
            this.j = 0; // scanning pointer
            this.minIndex = 0; // index of current minimum found
            this.phase = 'scan'; // 'scan' (looking for min) or 'swap' (ready to swap with i)
            this.lockedIndices = new Set();
        }
    }

    isSorted() {
        for (let idx = 0; idx < this.array.length - 1; idx++) {
            if (this.array[idx] > this.array[idx + 1]) return false;
        }
        return true;
    }

    // ==========================================
    // BUBBLE SORT LOGIC
    // ==========================================
    getBubbleExpectedAction() {
        if (this.type !== 'bubble' || this.isFinished) return null;
        const leftVal = this.array[this.j];
        const rightVal = this.array[this.j + 1];
        return leftVal > rightVal ? 'SWAP' : 'KEEP';
    }

    bubbleStep(userAction) {
        // userAction: 'SWAP' or 'KEEP'
        if (this.type !== 'bubble' || this.isFinished) return null;

        const leftVal = this.array[this.j];
        const rightVal = this.array[this.j + 1];
        const expected = leftVal > rightVal ? 'SWAP' : 'KEEP';

        this.comparisons++;

        const isCorrect = (userAction === expected);
        let actionDesc = "";

        if (!isCorrect) {
            this.errors++;
            if (expected === 'SWAP') {
                actionDesc = `ผิดพลาด! ${leftVal} มากกว่า ${rightVal} จึงต้อง "สลับที่ (SWAP)"`;
            } else {
                actionDesc = `ผิดพลาด! ${leftVal} น้อยกว่าหรือเท่ากับ ${rightVal} จึงไม่ต้องสลับ (เลือก "ข้าม/คงเดิม (KEEP)")`;
            }
            return {
                success: false,
                isCorrect: false,
                message: actionDesc,
                j: this.j,
                jNext: this.j + 1
            };
        }

        // Correct action executed
        if (userAction === 'SWAP') {
            const temp = this.array[this.j];
            this.array[this.j] = this.array[this.j + 1];
            this.array[this.j + 1] = temp;
            this.swaps++;
            this.swappedThisPass = true;
            actionDesc = `ถูกต้อง! สลับ ${leftVal} กับ ${rightVal} เนื่องจาก ${leftVal} > ${rightVal}`;
        } else {
            actionDesc = `ถูกต้อง! ข้าม ${leftVal} และ ${rightVal} เพราะเรียงถูกต้องอยู่แล้ว (${leftVal} <= ${rightVal})`;
        }

        let lockedIndex = null;
        let passCompleted = false;

        // Move pointer j forward
        this.j++;
        const currentPassEnd = this.n - 1 - this.i;

        if (this.j >= currentPassEnd) {
            // End of this pass! The item at currentPassEnd is now at its final sorted position
            passCompleted = true;
            lockedIndex = currentPassEnd;
            this.lockedIndices.add(lockedIndex);

            // Check if optimized finish (no swaps in entire pass)
            if (!this.swappedThisPass || this.isSorted()) {
                // All remaining items are sorted!
                for (let k = 0; k < this.n; k++) {
                    this.lockedIndices.add(k);
                }
                this.isFinished = true;
                actionDesc += ` | ยอดเยี่ยม! ข้อมูลเรียงสมบูรณ์แล้ว ✨`;
                return {
                    success: true,
                    isCorrect: true,
                    action: userAction,
                    message: actionDesc,
                    passCompleted: true,
                    lockedIndex,
                    isFinished: true
                };
            }

            // Advance to next pass
            this.i++;
            this.j = 0;
            this.swappedThisPass = false;

            if (this.i >= this.n - 1) {
                // Lock the very first element as well
                this.lockedIndices.add(0);
                this.isFinished = true;
                actionDesc += ` | เสร็จสิ้นทุกรอบ! ข้อมูลเรียงสมบูรณ์ ✨`;
            }
        }

        return {
            success: true,
            isCorrect: true,
            action: userAction,
            message: actionDesc,
            passCompleted,
            lockedIndex,
            isFinished: this.isFinished,
            nextJ: this.j
        };
    }

    // ==========================================
    // SELECTION SORT LOGIC
    // ==========================================
    // In Selection Sort game mode:
    // Player targets the current slot `this.i`.
    // Player can either scan or directly pick the minimum element among index `this.i` to `this.n - 1`
    getSelectionTrueMin() {
        if (this.type !== 'selection' || this.isFinished) return -1;
        let minIdx = this.i;
        for (let k = this.i + 1; k < this.n; k++) {
            this.comparisons++;
            if (this.array[k] < this.array[minIdx]) {
                minIdx = k;
            }
        }
        return minIdx;
    }

    selectionSelectMinAndSwap(selectedIdx) {
        if (this.type !== 'selection' || this.isFinished) return null;

        // Find the actual minimum index in remaining unsorted portion
        let trueMinIdx = this.i;
        for (let k = this.i; k < this.n; k++) {
            if (this.array[k] < this.array[trueMinIdx]) {
                trueMinIdx = k;
            }
        }

        const isCorrect = (selectedIdx === trueMinIdx);
        let actionDesc = "";

        if (!isCorrect) {
            this.errors++;
            actionDesc = `ผิดพลาด! ชิ้นที่เลือก (${this.array[selectedIdx]}) ไม่ใช่ค่าน้อยที่สุดในช่วง [${this.i}..${this.n - 1}]! ค่าน้อยสุดจริงคือ ${this.array[trueMinIdx]}`;
            return {
                success: false,
                isCorrect: false,
                message: actionDesc,
                expectedMinIdx: trueMinIdx,
                selectedIdx: selectedIdx
            };
        }

        // Correct minimum chosen!
        const minVal = this.array[trueMinIdx];
        const targetVal = this.array[this.i];

        if (trueMinIdx !== this.i) {
            // Swap
            this.array[trueMinIdx] = targetVal;
            this.array[this.i] = minVal;
            this.swaps++;
            actionDesc = `ถูกต้อง! สลับค่าน้อยสุด (${minVal}) ที่ตำแหน่ง [${trueMinIdx}] มาไว้ที่ตำแหน่งเป้าหมาย [${this.i}]`;
        } else {
            actionDesc = `ถูกต้อง! ค่าน้อยสุด (${minVal}) อยู่ที่ตำแหน่ง [${this.i}] อยู่แล้ว ไม่จำเป็นต้องสลับ`;
        }

        this.lockedIndices.add(this.i);
        const lockedIndex = this.i;

        this.i++;

        if (this.i >= this.n - 1) {
            // Last remaining element is naturally sorted
            this.lockedIndices.add(this.n - 1);
            this.isFinished = true;
            actionDesc += ` | ยอดเยี่ยม! จัดเรียงแบบ Selection Sort เสร็จสมบูรณ์ ✨`;
        }

        return {
            success: true,
            isCorrect: true,
            message: actionDesc,
            lockedIndex,
            isFinished: this.isFinished,
            nextTargetI: this.i
        };
    }
}

// Generate random array with distinct readable numbers
function generateDistinctArray(size, min = 10, max = 99) {
    const set = new Set();
    while (set.size < size) {
        const val = Math.floor(Math.random() * (max - min + 1)) + min;
        set.add(val);
    }
    return Array.from(set);
}

// Helper: Preset stages for progressive learning
const GAME_LEVELS = [
    {
        id: 1,
        algorithm: 'bubble',
        title: "ระดับ 1: ปฐมบทฟองสบู่ (Bubble Sort พื้นฐาน)",
        subtitle: "เปรียบเทียบทีละคู่ติดกันและดันค่ามากที่สุดไปขวา",
        theme: "book",
        data: [45, 12, 89, 23],
        description: "ยินดีต้อนรับสู่หอสมุดเวทมนตร์! เรียงหนังสือ 4 เล่มด้วย Bubble Sort สังเกตตัวชี้สีฟ้า ให้กด 'สลับ' หากเล่มซ้ายสูงกว่าเล่มขวา",
        targetComparisons: 6,
        targetSwaps: 3
    },
    {
        id: 2,
        algorithm: 'bubble',
        title: "ระดับ 2: คาราวานสินค้า (Bubble Sort 5 ชิ้น)",
        subtitle: "เพิ่มความยาวแถวและสังเกตตำแหน่งที่ถูกล็อค (Locked)",
        theme: "train",
        data: [72, 31, 15, 94, 56],
        description: "จัดเรียงตู้รถไฟสินค้า 5 ตู้ ทุกครั้งที่จบรอบ ตู้ที่หนักที่สุดจะเข้าสู่ชานชาลาที่ถูกต้องทางขวาสุด",
        targetComparisons: 10,
        targetSwaps: 5
    },
    {
        id: 3,
        algorithm: 'bubble',
        title: "ระดับ 3: หนังสือโบราณย้อนศร (Worst Case Bubble)",
        subtitle: "ท้าทายกรณีแย่ที่สุด ข้อมูลเรียงกลับด้าน O(n²)",
        theme: "book",
        data: [90, 75, 60, 45, 30, 15],
        description: "หนังสือถูกจัดเรียงย้อนหลังจากมากไปน้อย! คุณต้องทำการเปรียบเทียบและสลับทุกครั้งจนครบทุกคู่",
        targetComparisons: 15,
        targetSwaps: 15
    },
    {
        id: 4,
        algorithm: 'selection',
        title: "ระดับ 4: นักล่าค่าน้อยสุด (Selection Sort เริ่มต้น)",
        subtitle: "สแกนหาตัวที่น้อยที่สุด แล้วนำมาไว้ที่ตำแหน่งแรก",
        theme: "train",
        data: [64, 25, 12, 22, 11],
        description: "เรียนรู้อัลกอริทึมใหม่! Selection Sort ไม่ต้องสลับทีละคู่ แต่ให้มองหา 'ตู้ที่เบาที่สุด' ในส่วนที่ยังไม่จัดเรียง แล้วคลิกเลือกเพื่อสลับมาข้างหน้า",
        targetComparisons: 10,
        targetSwaps: 4
    },
    {
        id: 5,
        algorithm: 'selection',
        title: "ระดับ 5: คัมภีร์เวท 6 เล่ม (Selection Sort 6 ชิ้น)",
        subtitle: "เลือกค่าน้อยที่สุดทีละเล่มเพื่อจัดเข้าชั้นวาง",
        theme: "book",
        data: [50, 28, 88, 14, 71, 36],
        description: "สังเกตว่า Selection Sort มีการสลับที่ (Swap) น้อยมากเพียงรอบละ 1 ครั้งเท่านั้น!",
        targetComparisons: 15,
        targetSwaps: 5
    },
    {
        id: 6,
        algorithm: 'selection',
        title: "ระดับ 6: ชานชาลาเต็มรูปแบบ (Selection Sort 8 ชิ้น)",
        subtitle: "ฝึกสายตาการค้นหาค่าน้อยที่สุดในข้อมูลขนาดใหญ่",
        theme: "train",
        data: [82, 19, 44, 95, 33, 67, 12, 58],
        description: "ตู้รถไฟ 8 ตู้ สแกนหาตู้ที่น้อยที่สุดในส่วนที่เหลือแล้วคลิกเพื่อจัดส่ง",
        targetComparisons: 28,
        targetSwaps: 7
    },
    {
        id: 7,
        algorithm: 'bubble',
        title: "ระดับ 7: ปรมาจารย์ฟองสบู่ (Master Bubble 7 ชิ้น)",
        subtitle: "ทดสอบความเร็วและความแม่นยำในการจัดเรียง",
        theme: "book",
        data: [65, 34, 82, 11, 49, 93, 27],
        description: "รวมทักษะ Bubble Sort ทำคอมโบต่อเนื่องโดยไม่กดผิดเพื่อรับ 3 ดาวเต็ม!",
        targetComparisons: 21,
        targetSwaps: 11
    },
    {
        id: 8,
        algorithm: 'selection',
        title: "ระดับ 8: สุดยอดบรรณารักษ์ (The Grand Finale)",
        subtitle: "การทดสอบขั้นสูงสุดของ Selection Sort",
        theme: "book",
        data: [77, 98, 21, 63, 15, 84, 42, 39],
        description: "ด่านสุดท้ายเพื่อก้าวขึ้นสู่ตำแหน่ง Grand Sorter Master!",
        targetComparisons: 28,
        targetSwaps: 7
    }
];
