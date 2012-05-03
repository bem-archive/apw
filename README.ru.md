**APW (arch-plan-workers)** является ядром системы сборки, в которой:

 * узлы графа целей могут менять граф
 * процесс сборки асинхронный

Конфигурационные файлы (конфиги) пишутся на языке JavaScript. Широко используется библиотека promises [Q](https://github.com/kriskowal/q).

## Пример использования

Демонстрационный пример элементарного конфига:

```js
var APW = require('apw');

exports.getArch = function() {
    var arch = new APW.Arch();

    arch.setNode('all', { run: function() { console.log('all: done') }});
    arch.setNode('compile', { run: function() { console.log('compile: done') }}, 'all');
    arch.setNode('test', { run: function() { console.log('test: done') }}, 'compile');

    return arch;
};
```

Запуск:

    apw -f make.js

Результат:

    test: done
    compile: done
    all: done

Пример сложного конфига: [github.com/bem/bem-tools](https://github.com/bem/bem-tools/tree/server)

## Установка

Перед установкой следует убедиться, что уже установлены:

 * Node.js (platform built on Chrome's JavaScript runtime) — [nodejs.org](http://nodejs.org)
 * npm (package manager for node) — [npmjs.org](http://npmjs.org/)

Для использования в качестве модуля через API (рекомендуемый вариант):

    npm install apw

Для использования в command-line:

    npm install apw -g

## Детальнее

### Основные понятия:

 * **Arch** (архитектура) — граф сборки, в котором каждая задача (или target в терминах make) является узлом (**Node**). Он собирает в себя абсолютно все задачи вне зависимости от того, будут ли они выполняться или нет.
 * **Node** (узел) — в общем случае отделяемая и предназначенная для выполнения задача. Например, валидация CSS, сборка файла документации, запуск тестов и т.п. Код узла может порождать новые узлы и совершать иные манипуляции с графом.
 * **Plan** (план) — план выполнения последовательности задач. Он определяет, какая следующая задача будет отправлена на выполнение.
 * **Workers** (исполнители) — сущности, фактически выполняющие задачи.

### Как это работает?

Пользователь создаёт конфиг с обязательным `exports.getArch` — эта функция должна вернуть экземпляр **Arch**.

Пользователь запускает сборку указанной задачи (например, `test`) либо из командной строки, либо из JavaScript кода.

Из переданного графа `apw` выделяет план сборки для `test`. Он включает в себя все актуальные на тот момент зависимости.

План передаётся на выполнение исполнителям. Если в процессе выполнения в графе появляются новые задачи и они связаны с задачами, входящими в план, план дополняется.

Если хотя бы одна задача не завершилась успешно, выполнение прекращается.

## Написание конфига

Минимальный конфиг, с помощью которого можно проверить, всё ли верно установлено, выглядит так:

```js
var APW = require('apw');

exports.getArch = function() {
    return new APW.Arch();
};
```

Результат при выполнении:

    ** No rule to make target 'all'

Имеет смысл заполнить граф задачами. На этапе инициализации это делается с помощью функций `Arch.setNode()` и `Arch.link()`. Например, для создания цепи задач `A -> (B, C)` можно написать вот такой код:

```js
arch.setNode('A', { run: function() { console.log('A') }});
arch.setNode('B', { run: function() { console.log('B') }}, 'A');
arch.setNode('C', { run: function() { console.log('C') }}, 'A');
```

.. или:

```js
arch.setNode('A', { run: function() { console.log('A') }});
arch.setNode('B', { run: function() { console.log('B') }});
arch.setNode('C', { run: function() { console.log('C') }});
arch.link(['B', 'C'], 'A');
```

.. или:

```js
arch.setNode('B', { run: function() { console.log('B') }});
arch.setNode('C', { run: function() { console.log('C') }});
arch.setNode('A', { run: function() { console.log('A') }}, null, ['B', 'C']);
```

Во всех вариантах результат выполнения задачи `A` будет одинаков:

    B
    C
    A

С графом можно работать и во время выполнения. Вот пример конфига, в котором задача `C` порождается задачей `B` и связывается с задачей `A`:

```js
arch.setNode('A', { run: function() { console.log('A') }});
arch.setNode('B', {
        run: function(ctx) {
            var lock = ctx.arch.withLock(function() {
                ctx.arch.setNode('C', { run: function() { console.log('C') }}, 'A');
            });
            console.log('B');
            return lock;
        }
    }, 'A');
```

.. или с другим вариантом `B`:

```js
arch.setNode('B', {
        run: function(ctx) {
            ctx.arch.lock();
            ctx.arch.setNode('C', { run: function() { console.log('C') }}, 'A');
            ctx.arch.unlock();
            console.log('B');
        }
    }, 'A');
```

Результат выполнения всё тот же:

    B
    C
    A

Обратите внимание на использование функций `Arch.withLock()`, `Arch.lock()` и `Arch.unlock()`. Дело в том, что лучше (а в общем случае обязательно) уведомить `apw` о том, что вы намереваетесь изменять граф. В этом случае `apw` "становится на паузу" — уже запущенные задачи продолжают выполняться, но новые задачи из очереди не выбираются до поры, пока не будет вызван `unlock()`, либо пока не завершится выполнение `withLock()`. Также следует выполнять два правила:

 * не манипулировать с задачами, которые уже могли выполниться
 * не манипулировать с задачей, которая в данный момент выполняется (включая себя)

Если у вас всё-таки возникает нужда нарушить эти правила, скорее всего, есть ошибка в построении зависимостей и разумнее будет перекомпоновать задачи.

Полезными могут оказаться и следующие функции.

Удаление задачи из графа (`Arch.removeNode()`):

```js
arch.setNode('A', { run: function() { console.log('A') }});
arch.setNode('B', { run: function() { console.log('B') }}, 'A');
arch.setNode('C', { run: function() { console.log('C') }}, 'A');
arch.setNode('D', {
        run: function(ctx) {
            var lock = ctx.arch.withLock(function() {
                ctx.arch.removeNode('C');
            });
            console.log('D');
            return lock;
        }
    }, ['B', 'C']);
```

Результат выполнения (задача `C` отсутствует):

    D
    B
    A

Замещение задачи другой задачей (`Arch.replaceNode()`):

```js
arch.setNode('A', { run: function() { console.log('A') }});
arch.setNode('B', { run: function() { console.log('B') }}, 'A');
arch.setNode('C', {
        run: function(ctx) {
            var lock = ctx.arch.withLock(function() {
                ctx.arch.replaceNode('B', {
                    run: function() { console.log('new B') }
                });
            });
            console.log('C');
            return lock;
        }
    }, 'B');
```

Результат выполнения (функция `run` задачи `B` замещена):

    C
    new B
    A

Проверка наличия задачи в графе (`Arch.hasNode()`):

```js
arch.setNode('A', { run: function() { console.log('A') }});
arch.setNode('B', {
        run: function(ctx) {
            ctx.arch.lock();
            if (!ctx.arch.hasNode('C')) {
                ctx.arch.setNode('C', { run: function() { console.log('C') }}, 'A');
            }
            ctx.arch.unlock();
            console.log('B');
        }
    }, 'A');
```

Результат выполнения:

    B
    C
    A

## Выполнение конфига через API

Если требуется выполнить конфиг через API, а не из командной строки, следует использовать `Runner`. Минимальный пример такого запуска:

```js
var APW = require('apw'),
    arch = new APW.Arch();

arch.setNode('A', { run: function() { console.log('A') }});

new APW.Runner(arch).process('A');
```

Запуск (предположим, `test.js`):

    node test.js

Результат выполнения:

    A

При создании `Runner` можно подмешивать свой контекст:

```js
var APW = require('apw'),
    arch = new APW.Arch();

arch.setNode('A', { run: function(ctx) { console.log('A: ' + ctx.my) }});

new APW.Runner(arch, 2, { my: 'ok' }).process('A');
```

Результат выполнения:

    A: ok

## API

Описание функций находится в JSDoc файлов APW.

### Основные сущности

#### id

Уникальный строковый идентификатор вашей задачи в графе, её имя. Используется для поиска, удаления, связывания и т.п. Помимо того, что apw различает задачи по `id`, вам может оказаться удобным использовать его для собственных специальных целей, например, для определения типа задачи по собственной схеме именования.

#### node

Объект, который и является задачей. В большинстве случаев задача выглядит так:

```js
{
    run: function(ctx) { /* .. do something .. */ }
}
```

Функция `run` запускается `apw` на этапе выполнения задачи. Её аргументом `ctx` является контекст — объект, по умолчанию включающий в себя `arch` — выполняемая задача может изменить граф сборки (что отразится на планах), добавить новые задачи, удалить ненужные, перекомпоновать зависимости.

#### parent

Задача-родитель, зависит от задачи-ребёнка (`child`) и не выполняется, пока не выполнится ребёнок. У задачи может и не быть явного родителя.

#### child

Задача-ребёнок, блокирует выполнение родителя (`parent`), пока не выполнится сама.