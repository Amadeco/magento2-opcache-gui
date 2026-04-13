<?php
/**
 * OPcache GUI block interface
 *
 * @author    Ilan Parmentier
 * @copyright Copyright © Amadeco. All rights reserved.
 * @license   MIT License
 */
declare(strict_types=1);

namespace Amadeco\OpcacheGui\Block\Adminhtml;

use Amnuts\Opcache\Service as OpcacheService;

interface GuiInterface
{
    /**
     * Return the OPcache service instance (handled only once per request).
     *
     * @return OpcacheService
     */
    public function getOpcache(): OpcacheService;

    /**
     * Shortcut to read a service option by key.
     *
     * @param string $key
     * @return mixed
     */
    public function getOpcacheOption(string $key): mixed;

    /**
     * Return the full UI config consumed by the React application.
     *
     * @return array<string,mixed>
     */
    public function getConfig(): array;

    /**
     * JSON-encoded version of the React app config.
     *
     * @return string
     */
    public function getSerializedConfig(): string;

    /**
     * Compute performance data for the OPcache status card.
     *
     * @return array{
     *     available: bool,
     *     errors: string[],
     *     warnings: string[],
     *     metrics: array<int, array{label:string,value:string}>
     * }
     */
    public function getPerformanceData(): array;

    /**
     * Check if OPcache PHP APIs are available.
     *
     * @return bool
     */
    public function isOpcacheAvailable(): bool;
}
