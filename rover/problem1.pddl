;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; PROBLEM1.PDDL
;; Escenario base: transporte de dos minerales al laboratorio
;;
;; Descripción:
;; El rover inicia en L4. Debe recoger dos minerales:
;; - rock1 ubicado en L1
;; - rock2 ubicado en L2
;;
;; Ambos minerales deben ser entregados en el laboratorio L5.
;;
;; Restricciones de camino:
;; - L1 <-> L3
;; - L3 -> L2
;; - L2 -> L4
;; - L3 <-> L4
;; - L4 <-> L5
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define (problem rover-problem-1)

    (:domain rover-domain)

    (:objects
        rover1
        rock1 rock2
        l1 l2 l3 l4 l5
    )

    (:init
        ;; Estado inicial del rover
        (at rover1 l4)
        (empty rover1)

        ;; Ubicación inicial de los minerales
        (rock-at rock1 l1)
        (rock-at rock2 l2)

        ;; Laboratorio disponible
        (lab l5)

        ;; El laboratorio L5 acepta ambos minerales
        (accepts l5 rock1)
        (accepts l5 rock2)

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
    )

    (:goal
        (and
            ;; Objetivo principal:
            ;; ambos minerales deben ser entregados.
            (delivered rock1)
            (delivered rock2)

            ;; Opcional:
            ;; descomentar si se desea que el rover regrese
            ;; a su posición/base inicial después de la entrega.
            ;; (at rover1 l4)
        )
    )
)