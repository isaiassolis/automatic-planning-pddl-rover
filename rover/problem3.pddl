;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; PROBLEM3.PDDL
;; Escenario avanzado: múltiples minerales, nuevas rutas
;; y dos laboratorios especializados
;;
;; Descripción:
;; El rover inicia en L4. Debe transportar cuatro minerales:
;; - rock1 ubicado en L1
;; - rock2 ubicado en L2
;; - rock3 ubicado en L6
;; - rock4 ubicado en L8
;;
;; Laboratorios:
;; - L5 acepta rock1 y rock2
;; - L9 acepta rock3 y rock4
;;
;; Nuevas localidades:
;; - L6, L7, L8, L9
;;
;; Nuevas restricciones:
;; - L5 -> L6
;; - L6 <-> L7
;; - L7 -> L3
;; - L7 -> L8
;; - L8 -> L9
;; - L9 -> L5
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define (problem rover-problem-3)

    (:domain rover-domain)

    (:objects
        rover1
        rock1 rock2 rock3 rock4
        l1 l2 l3 l4 l5 l6 l7 l8 l9
    )

    (:init
        ;; Estado inicial del rover
        (at rover1 l4)
        (empty rover1)

        ;; Ubicación inicial de los minerales
        (rock-at rock1 l1)
        (rock-at rock2 l2)
        (rock-at rock3 l6)
        (rock-at rock4 l8)

        ;; Laboratorios disponibles
        (lab l5)
        (lab l9)

        ;; Compatibilidad laboratorio-mineral
        (accepts l5 rock1)
        (accepts l5 rock2)

        (accepts l9 rock3)
        (accepts l9 rock4)

        ;; Caminos originales del problema 1

        ;; L1 <-> L3
        (connected l1 l3)
        (connected l3 l1)

        ;; L3 -> L2
        (connected l3 l2)

        ;; L2 -> L4
        (connected l2 l4)

        ;; L3 <-> L4
        (connected l3 l4)
        (connected l4 l3)

        ;; L4 <-> L5
        (connected l4 l5)
        (connected l5 l4)

        ;; Nuevos caminos del escenario 3

        ;; L5 -> L6
        (connected l5 l6)

        ;; L6 <-> L7
        (connected l6 l7)
        (connected l7 l6)

        ;; L7 -> L3
        (connected l7 l3)

        ;; L7 -> L8
        (connected l7 l8)

        ;; L8 -> L9
        (connected l8 l9)

        ;; L9 -> L5
        (connected l9 l5)
    )

    (:goal
        (and
            (delivered rock1)
            (delivered rock2)
            (delivered rock3)
            (delivered rock4)

            ;; Opcional:
            ;; descomentar si se desea que el rover regrese
            ;; a su posición/base inicial después de la entrega.
            ;; (at rover1 l4)
        )
    )
)