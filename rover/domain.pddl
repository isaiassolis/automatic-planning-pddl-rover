;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; DOMAIN.PDDL
;; Descripción:
;; Este dominio modela un rover encargado de transportar
;; minerales desde distintas localidades hacia laboratorios
;; de análisis. El dominio está diseñado para reutilizarse
;; en tres escenarios distintos mediante archivos problem.pddl.
;;
;; Características del dominio:
;; - El rover puede moverse entre localidades conectadas.
;; - Las conexiones pueden ser unidireccionales o bidireccionales.
;; - El rover puede recoger minerales.
;; - El rover solo puede cargar un mineral a la vez.
;; - El rover puede entregar minerales únicamente en laboratorios.
;; - Cada laboratorio puede aceptar minerales específicos.
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define (domain rover-domain)

    (:requirements :strips)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; PREDICADOS
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

    (:predicates

        ;; El rover ?r se encuentra en la localidad ?l.
        (at ?r ?l)

        ;; El mineral ?rock se encuentra en la localidad ?l.
        (rock-at ?rock ?l)

        ;; Existe un camino permitido desde ?from hacia ?to.
        ;; Para caminos bidireccionales deben declararse ambas direcciones.
        (connected ?from ?to)

        ;; El rover ?r está cargando el mineral ?rock.
        (carrying ?r ?rock)

        ;; El rover ?r se encuentra vacío y puede recoger un mineral.
        (empty ?r)

        ;; La localidad ?loc es un laboratorio.
        (lab ?loc)

        ;; El laboratorio ?loc acepta analizar el mineral ?rock.
        (accepts ?loc ?rock)

        ;; El mineral ?rock ya fue entregado correctamente.
        (delivered ?rock)
    )

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; ACCIÓN: MOVE
;; Permite mover el rover entre dos localidades conectadas.
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

    (:action move

        :parameters (?r ?from ?to)

        :precondition
            (and
                (at ?r ?from)
                (connected ?from ?to)
            )

        :effect
            (and
                (not (at ?r ?from))
                (at ?r ?to)
            )
    )

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; ACCIÓN: PICKUP
;; Permite que el rover recoja un mineral si:
;; - Está en la misma localidad que el mineral.
;; - No está cargando otro mineral.
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

    (:action pickup

        :parameters (?r ?rock ?loc)

        :precondition
            (and
                (at ?r ?loc)
                (rock-at ?rock ?loc)
                (empty ?r)
            )

        :effect
            (and
                (not (rock-at ?rock ?loc))
                (not (empty ?r))
                (carrying ?r ?rock)
            )
    )

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; ACCIÓN: DROP
;; Permite entregar un mineral si:
;; - El rover está en un laboratorio.
;; - El rover lleva el mineral.
;; - El laboratorio acepta ese mineral.
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

    (:action drop

        :parameters (?r ?rock ?loc)

        :precondition
            (and
                (at ?r ?loc)
                (carrying ?r ?rock)
                (lab ?loc)
                (accepts ?loc ?rock)
            )

        :effect
            (and
                (not (carrying ?r ?rock))
                (empty ?r)
                (delivered ?rock)
            )
    )

)