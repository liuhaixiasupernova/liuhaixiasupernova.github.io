/* World 1-3: registration, quiz, reflection and reading. Panel 1 is KNN (knn.js); panels 2 and 3 use a small neural network (ann.js). */
(function () {
  'use strict';
  var K = window.KNN, ANN = window.ANN;

  AI2.register({
    id: 'knn', n: '1-3', title: 'Predict', short: 'KNN, neural networks, overfitting and honest evaluation', color: '#c2255c',
    intro: 'Models that learn from data, guessing the genre of a song. First k-nearest neighbours, which just remembers songs. Then a small neural network, which trains over epochs and can clearly overfit. The hard part is knowing whether to believe a model\'s accuracy, so you will watch overfitting happen and compare models fairly.',
    demos: [
      { title: '1 How KNN decides', build: K.buildA },
      { title: '2 Overfitting (neural network)', build: ANN.buildOver },
      { title: '3 Folds, seeds and a t-test', build: ANN.buildCV }
    ],
    quiz: [
      { tag: 'how KNN works', q: 'What does k-nearest neighbours actually do at training time?',
        opts: ['It fits a line through the songs', 'Almost nothing: it stores the training songs, and the work happens when a new song must be classified', 'It learns one weight per genre', 'It removes songs that are hard to classify'], a: 1,
        why: 'KNN is a lazy learner. Training is just storing the data. At prediction time it measures the distance to the stored songs and lets the k closest vote.',
        tip: 'In "How KNN decides", drop a mystery song and watch the lines to its neighbours appear only when you ask.' },
      { tag: 'choosing k', q: 'Moving k from 1 to 25 turns jagged islands into smooth regions. What is the trade-off?',
        opts: ['Small k is always better because it is more precise', 'Small k follows every quirk and noise in the data; large k smooths over noise but can blur real local structure', 'Large k always overfits', 'k changes only the speed, not the predictions'], a: 1,
        why: 'Small k gives flexible, high-variance boundaries that chase noise. Large k gives stable, high-bias boundaries that can miss real detail. A good k sits in between.',
        tip: 'Use the "k = 1 (jagged)" and "k = 25 (smooth)" presets and compare the regions.' },
      { tag: 'feature scaling', q: 'Why did switching off feature scaling make the decision regions look like vertical stripes?',
        opts: ['Brightness became more important', 'Tempo has numbers around 100 and brightness only 0 to 1, so tempo dominated the distance and brightness was almost ignored', 'The nearest neighbours were chosen at random', 'k became 1'], a: 1,
        why: 'KNN is built on distances. A feature with a larger numeric range dominates them. Scaling (for example z-scores computed on the training set) puts features on an equal footing.',
        tip: 'Press "Scaling off" and compare the regions and the readout with scaling on.' },
      { tag: 'overfitting', q: 'While training a neural network, the training loss keeps falling towards zero, but the validation loss falls and then starts to rise. What does this show?',
        opts: ['The network is learning better and better', 'Overfitting: after the turning point the network memorises the training songs, noise included, and gets worse on new songs', 'The validation set is broken', 'The learning rate is too small'], a: 1,
        why: 'Training loss can always be pushed down by memorising. Validation loss measures songs the network never trained on, so when it turns upwards while training loss keeps falling, the extra training is memorisation, not learning.',
        tip: 'Open "Overfitting (neural network)", press "Overfit it", and drag the epoch slider past the green line.' },
      { tag: 'epochs', q: 'What is one epoch?',
        opts: ['One update of a single weight', 'One complete pass of the network over every training song', 'One hidden layer', 'One test on the validation songs'], a: 1,
        why: 'An epoch is one full pass through the training data. Training for more epochs means more passes. The number of epochs is a choice, and too many leads to overfitting.',
        tip: 'The x-axis of the loss chart counts epochs. Drag "Stop training at epoch" to move along it.' },
      { tag: 'fixing overfitting', q: 'Which of these is NOT a sensible way to reduce overfitting in a neural network?',
        opts: ['Stop training earlier, when validation loss is lowest', 'Use a smaller network or weight decay', 'Collect more training songs or remove useless features', 'Keep training until the training loss is as low as possible'], a: 3,
        why: 'Training loss rewards memorising, so it always keeps improving with more epochs. The others all help: early stopping, a smaller network and weight decay limit how much the network can memorise, and more data or fewer noise features give it less to be fooled by.',
        tip: 'Try Fix 1 to Fix 5 one at a time and watch the gap between the two lines.' },
      { tag: 'repeated cross-validation', q: 'Why use 10-fold cross-validation, repeated with several seeds, to choose the number of epochs?',
        opts: ['Neural networks cannot be trained twice', 'One split can be lucky or unlucky; every song is tested once, and new shuffles show how much the answer depends on the split and on the random start of the network', 'To train on the test set', 'To make the network bigger'], a: 1,
        why: 'A single split gives one number that depends on which songs landed in the test set, and a network also depends on its random starting weights. Cross-validation tests on every song once, and repeating with new shuffles shows the spread.',
        tip: 'In panel 3 look at the range of single-fold accuracies, then at the spread across seeds.' },
      { tag: 'honest evaluation', q: 'You train for many epochs, pick the epoch with the best score on the validation songs, and report that score as your accuracy. What is wrong?',
        opts: ['Nothing, that is standard practice', 'The validation songs helped choose the model, so the score is optimistic. Choose the epoch with validation or cross-validation, and report accuracy once on a separate test set that played no part in the choice', 'The validation set is too small to use', 'You should have used more epochs'], a: 1,
        why: 'Once results on a set influence a choice, that set is no longer unseen. Keep a separate test set, untouched, for one final honest check.',
        tip: 'Panel 2 is an illustration only. Panel 3 chooses between training lengths using folds, without peeking at a separate test set.' },
      { tag: 'statistical test', q: 'Over 10 seeds model B is 5 points more accurate than A, but the corrected resampled t-test gives p = 0.09. What is the sensible conclusion?',
        opts: ['B is proven better because 5 points is a lot', 'The evidence is not strong enough to claim B is better; the gap could come from the particular splits', 'A is better', 'The test is wrong because it disagrees with the simple t-test'], a: 1,
        why: 'The simple test treats the 100 folds as independent, but training sets overlap, so it is overconfident. The corrected test accounts for this. With p = 0.09 you should say the result is promising but not established.',
        tip: 'In panel 3 run "100 against 300 epochs" and compare the two p-values.' },
      { tag: 'p-value', q: 'What does p = 0.03 mean?',
        opts: ['There is a 3% chance the two models are equal', 'If the two models were truly equal, a difference at least this large would appear in about 3% of experiments', 'Model B is 97% likely to be better', 'Model B is 3% more accurate'], a: 1,
        why: 'A p-value is a probability about the data, assuming no real difference. It is not the probability that the hypothesis is true, and it says nothing about how big or useful the difference is.',
        tip: 'In panel 3 run "No useless features: 100 against 300" and notice p is large when the two are about equal.' }
    ],
    reflect: [
      'How would you convince a sceptical colleague that your neural network is not overfitting? Which curves or numbers would you show them?',
      'Why is a single train/test split not enough to say one model beats another? What did 10 folds x 5 seeds show you that one split could not?',
      'Name one thing about a real music genre dataset (the features, the labels, how songs were collected) that could make your accuracy look better than it will be on new music.'
    ],
    more: [
      { h: 'Try next', p: ['In panel 2 slide the useless features from 0 to 20 with 40 songs. When does the overfitting get worse? Then raise the training songs to 140.', 'In panel 3 run "5 different seeds" a few times. Does your conclusion stay the same? Why does that matter when you write up results?'] },
      { h: 'Ideas to remember', p: ['Scale the features, use unseen data, watch validation loss over epochs, compare choices on identical folds, repeat with several seeds, and test the difference.', 'Training loss flatters. Validation loss informs. A tuned choice (like the number of epochs) needs its own data to be judged fairly.'] },
      { h: 'Beyond this demo', p: ['Dropout, data augmentation, learning-rate schedules, early stopping with patience, and nested cross-validation for tuning and testing together.', 'Other tests: the Wilcoxon signed-rank test, and the Friedman test with post-hoc comparisons when you compare many models over many datasets. For music, split by artist or album so that songs from the same record never sit on both sides.'] },
      { h: 'Further reading', cls: 'read', p: ['Demsar (2006), Statistical comparisons of classifiers over multiple data sets, Journal of Machine Learning Research. Dietterich (1998), Approximate statistical tests for comparing supervised classification learning algorithms, Neural Computation. Nadeau and Bengio (2003), Inference for the generalization error, Machine Learning.', 'Tzanetakis and Cook (2002), Musical genre classification of audio signals, IEEE Transactions on Speech and Audio Processing. Sturm (2013), The GTZAN dataset: its contents, its faults, their effects on evaluation, and its future use, arXiv.'] }
    ]
  });
})();
