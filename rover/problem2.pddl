;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; PROBLEM2.PDDL
;; Escenario extendido: tres minerales y nuevas localidades
;;
;; Descripción:
;; El rover inicia en L4. Debe transportar tres minerales:
;; - rock1 ubicado en L1
;; - rock2 ubicado en L2
;; - rock3 ubicado en L6
;;
;; Todos los minerales deben entregarse en el laboratorio L5.
;;
;; Nuevas localidades:
;; - L6
;; - L7
;;
;; Nuevas restricciones:
;; - L5 -> L6
;; - L6 -> L7
;; - L7 -> L3
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define (problem rover-problem-2)

    (:domain rover-domain)

    (:objects
        rover1
        rock1 rock2 rock3
        l1 l2 l3 l4 l5 l6 l7
    )

    (:init
        ;; Estado inicial del rover
        (at rover1 l4)
        (empty rover1)

        ;; Ubicación inicial de los minerales
        (rock-at rock1 l1)
        (rock-at rock2 l2)
        (rock-at rock3 l6)

        ;; Laboratorio disponible
        (lab l5)

        ;; El laboratorio L5 acepta todos los minerales
        (accepts l5 rock1)
        (accepts l5 rock2)
        (accepts l5 rock3)

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

        ;; Nuevos caminos del escenario 2

        ;; L5 -> L6
        (connected l5 l6)

        ;; L6 -> L7
        (connected l6 l7)

        ;; L7 -> L3
        (connected l7 l3)
    )

    (:goal
        (and
            (delivered rock1)
            (delivered rock2)
            (delivered rock3)

            ;; Opcional:
            ;; descomentar si se desea que el rover regrese
            ;; a su posición/base inicial después de la entrega.
            ;; (at rover1 l4)
        )
    )
)