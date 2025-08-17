import {CreateCommand, Id, Query, UpdateCommand} from "../ports/resource-repository.port";
import {Observable} from "rxjs";

export interface Facade<T> {

    dispose(): void;

    list(query?: Query): void;

    get(id: Id): Observable<T>;

    create(cmd: CreateCommand<T>): Observable<T>;

    update(cmd: UpdateCommand<T>): Observable<T>;

    delete(id: Id): Observable<void>;

    watchAll(): void;

    unwatchAll(): void;

    watchOne(id: Id): void;

    unwatchOne(id: Id): void;
}