<?php
/**
 * OPcache GUI block
 *
 * Responsible for preparing server-side data for the admin UI:
 * - Exposes configuration for the React UI
 * - Computes performance/warning messages for OPcache status card
 *
 * @author    Ilan Parmentier
 * @copyright Copyright © Amadeco. All rights reserved.
 * @license   MIT License
 */
declare(strict_types=1);

namespace Amadeco\OpcacheGui\Block\Adminhtml;

use Amnuts\Opcache\Service as OpcacheService;
use Magento\Backend\Block\Template;
use Magento\Backend\Block\Template\Context;
use Magento\Framework\Serialize\SerializerInterface;

class Gui extends Template implements GuiInterface
{
    /** Minimum free memory (bytes) before emitting a low-memory warning. */
    private const int MIN_FREE_MEMORY_BYTES = 32 * 1024 * 1024; // 32MB

    /** Recommended minimum for Magento 2 projects. */
    private const int RECOMMENDED_MAX_FILES = 50000;
    private const int RECOMMENDED_MEMORY_MB = 256;

    /**
     * Cached service instance to avoid re-running handle() during a request.
     *
     * @var OpcacheService|null
     */
    private ?OpcacheService $handled = null;

    /**
     * Cached raw OPcache status (single collection per request).
     *
     * @var array<string,mixed>|null
     */
    private ?array $opcacheStatus = null;

    /**
     * Cached raw OPcache configuration (single collection per request).
     *
     * @var array<string,mixed>|null
     */
    private ?array $opcacheConfig = null;

    /**
     * Cached UI config array (built once per request).
     *
     * @var array<string,mixed>|null
     */
    private ?array $config = null;

    /**
     * @param Context             $context
     * @param SerializerInterface $serializer
     * @param OpcacheService      $opcacheService
     * @param array<mixed>        $data
     */
    public function __construct(
        Context $context,
        protected readonly SerializerInterface $serializer,
        protected readonly OpcacheService $opcacheService,
        array $data = []
    ) {
        parent::__construct($context, $data);
    }

    /**
     * Return the Opcache service (handled only once per request).
     *
     * @return OpcacheService
     */
    public function getOpcache(): OpcacheService
    {
        if ($this->handled === null) {
            $this->handled = $this->opcacheService->handle();
        }
        return $this->handled;
    }

    /**
     * Shortcut to read a service option by key.
     *
     * @param string $key
     * @return mixed
     */
    public function getOpcacheOption(string $key): mixed
    {
        return $this->getOpcache()->getOption($key);
    }

    /**
     * Return the full UI config consumed by the React application.
     *
     * @return array<string,mixed>
     */
    public function getConfig(): array
    {
        if ($this->config !== null) {
            return $this->config;
        }

        $this->config = [
            'api' => [
                'stateUrl' => $this->getUrl('opcache_gui/api/state'),
            ],
            'allow' => [
                'filelist'   => (bool)$this->getOpcacheOption('allow_filelist'),
                'invalidate' => (bool)$this->getOpcacheOption('allow_invalidate'),
                'reset'      => (bool)$this->getOpcacheOption('allow_reset'),
                'realtime'   => (bool)$this->getOpcacheOption('allow_realtime'),
            ],
            'cookie' => [
                'name' => (string)$this->getOpcacheOption('cookie_name'),
                'ttl'  => (int)$this->getOpcacheOption('cookie_ttl'),
            ],
            'opstate'         => $this->getOpcache()->getData(),
            'useCharts'       => (bool)$this->getOpcacheOption('charts'),
            'highlight'       => (array)$this->getOpcacheOption('highlight'),
            'debounceRate'    => (int)$this->getOpcacheOption('debounce_rate'),
            'perPageLimit'    => (int)$this->getOpcacheOption('per_page'),
            'realtimeRefresh' => (int)$this->getOpcacheOption('refresh_time'),
            'language'        => $this->getOpcacheOption('language_pack'),
        ];

        return $this->config;
    }

    /**
     * JSON-encoded version of the React app config.
     *
     * @return string
     */
    public function getSerializedConfig(): string
    {
        return $this->serializer->serialize($this->getConfig());
    }

    /**
     * Compute performance data for the "PHP OPcache Status Check" card.
     * Returns a normalized structure with availability, warnings, errors and metrics.
     *
     * @return array{
     *     available: bool,
     *     errors: string[],
     *     warnings: string[],
     *     metrics: array<int, array{label:string,value:string}>
     * }
     */
    public function getPerformanceData(): array
    {
        $data = [
            'available' => $this->isOpcacheAvailable(),
            'errors'    => [],
            'warnings'  => [],
            'metrics'   => [],
        ];

        if (!$data['available']) {
            $data['errors'][] = (string)__('Zend OPcache extension is not loaded. OPcache is not working.');
            return $data;
        }

        try {
            $status = $this->getOpcacheStatus();
            $conf   = $this->getOpcacheConfig();

            if (!is_array($status) || !is_array($conf)) {
                throw new \RuntimeException('Invalid OPcache status or configuration data');
            }

            if (isset($status['opcache_enabled']) && !$status['opcache_enabled']) {
                $data['errors'][] = (string)__('Zend OPcache is disabled.');
                return $data;
            }

            // Memory figures
            $used   = (float)($status['memory_usage']['used_memory']   ?? 0.0);
            $free   = (float)($status['memory_usage']['free_memory']   ?? 0.0);
            $wasted = (float)($status['memory_usage']['wasted_memory'] ?? 0.0);
            $total  = $used + $free + $wasted;
            $util   = $total > 0 ? ($used / $total) * 100 : 0.0;

            // Key directives
            $validateTimestamps  = $conf['directives']['opcache.validate_timestamps']   ?? null;
            $maxAcceleratedFiles = $conf['directives']['opcache.max_accelerated_files'] ?? null;
            $memoryConsumptionMb = $conf['directives']['opcache.memory_consumption']    ?? null;

            // Stats
            $hitRate          = isset($status['opcache_statistics']['hit_rate']) ? (float)$status['opcache_statistics']['hit_rate'] : null;
            $numCachedScripts = isset($status['opcache_statistics']['num_cached_scripts']) ? (int)$status['opcache_statistics']['num_cached_scripts'] : null;

            // Warnings
            if (extension_loaded('xdebug')) {
                $data['warnings'][] = (string)__(
                    'Xdebug is enabled. This causes significant performance overhead. Disable Xdebug on production servers.'
                );
            }
            if ($free < self::MIN_FREE_MEMORY_BYTES) {
                $data['warnings'][] = (string)__(
                    'Low OPcache free memory. Consider increasing opcache.memory_consumption. Current free memory: %1MB',
                    $this->formatNumber($free / 1048576, 2)
                );
            }
            if ($validateTimestamps === true) {
                $data['warnings'][] = (string)__(
                    'Timestamp validation is enabled. For optimal performance in production, disable opcache.validate_timestamps in php.ini.'
                );
            }
            if ($maxAcceleratedFiles !== null && (int)$maxAcceleratedFiles < self::RECOMMENDED_MAX_FILES) {
                $data['warnings'][] = (string)__(
                    'Low max_accelerated_files setting. For Magento 2, at least %1 is recommended. Current setting: %2',
                    self::RECOMMENDED_MAX_FILES,
                    number_format((int)$maxAcceleratedFiles)
                );
            }
            if ($memoryConsumptionMb !== null && (int)$memoryConsumptionMb < self::RECOMMENDED_MEMORY_MB) {
                $data['warnings'][] = (string)__(
                    'Low memory_consumption setting. For Magento 2, at least %1MB is recommended. Current setting: %2MB',
                    self::RECOMMENDED_MEMORY_MB,
                    (int)$memoryConsumptionMb
                );
            }

            // Metrics
            $data['metrics'][] = [
                'label' => (string)__('Memory Usage:'),
                'value' => sprintf(
                    '%sMB %s, %sMB %s, %sMB %s (%s %s)',
                    $this->formatNumber($used / 1048576, 2), (string)__('used'),
                    $this->formatNumber($free / 1048576, 2), (string)__('free'),
                    $this->formatNumber($wasted / 1048576, 2), (string)__('wasted'),
                    $this->formatNumber($util, 1) . '%', (string)__('utilization')
                ),
            ];

            if ($hitRate !== null) {
                $data['metrics'][] = [
                    'label' => (string)__('Hit Rate:'),
                    'value' => $this->formatNumber($hitRate, 2) . '%',
                ];
            }

            if ($memoryConsumptionMb !== null) {
                $data['metrics'][] = [
                    'label' => (string)__('Memory Allocation:'),
                    'value' => (int)$memoryConsumptionMb . 'MB',
                ];
            }

            if ($maxAcceleratedFiles !== null) {
                $data['metrics'][] = [
                    'label' => (string)__('Max Accelerated Files:'),
                    'value' => number_format((int)$maxAcceleratedFiles),
                ];
            }

            if ($numCachedScripts !== null) {
                $data['metrics'][] = [
                    'label' => (string)__('Cached Scripts:'),
                    'value' => number_format($numCachedScripts),
                ];
            }
        } catch (\Throwable $e) {
            $data['errors'][] = (string)__('Error: %1', $e->getMessage());
        }

        return $data;
    }

    /**
     * Check if OPcache APIs are available.
     *
     * @return bool
     */
    public function isOpcacheAvailable(): bool
    {
        return extension_loaded('Zend OPcache')
            && function_exists('opcache_get_status')
            && function_exists('opcache_get_configuration');
    }

    /**
     * Fetch and cache OPcache status (no script list).
     *
     * @return array<string,mixed>
     */
    private function getOpcacheStatus(): array
    {
        if ($this->opcacheStatus === null) {
            $status = opcache_get_status(false);
            $this->opcacheStatus = is_array($status) ? $status : [];
        }
        return $this->opcacheStatus;
    }

    /**
     * Fetch and cache OPcache configuration.
     *
     * @return array<string,mixed>
     */
    private function getOpcacheConfig(): array
    {
        if ($this->opcacheConfig === null) {
            $config = opcache_get_configuration();
            $this->opcacheConfig = is_array($config) ? $config : [];
        }
        return $this->opcacheConfig;
    }

    /**
     * Format a number with a dot decimal separator (for consistent admin display).
     *
     * @param float $value
     * @param int   $decimals
     * @return string
     */
    private function formatNumber(float $value, int $decimals = 0): string
    {
        return number_format($value, $decimals, '.', '');
    }
}